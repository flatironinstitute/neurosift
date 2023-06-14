import { useCallback, useMemo, useRef } from 'react'


/*
  Overview:
  This file defines two hooks which provide rate-limiting functions.
  
  "Rate-limiting" in this context refers to collecting values from a data stream
  in real time, forming them into less-frequent batches, so that an expensive
  operation (the "resolution") can run less frequently than the rate at which the data
  are generated.

  In concrete terms, this most often means collecting user input as it is generated, but
  updating the global state (e.g. calling reducer functions) at a slower rate. This can provide
  the feeling of real-time interactivity without the overhead of e.g. constant rerenders.

  The framework offers two types of rate-limited function, a debouncer and a throttler.
  
  A throttler sets a maximum rate at which updates are processed: the first time a data element
  appears, resolution will be scheduled for N milliseconds in the future, and that resolution
  will resole all data elements received after the first element and before the resolution fires.
  The resolution should never wait too long from the first input.

  A debouncer is the mirror image of a throttler. While a throttler schedules resolution for
  X ms from the *first* input, the debouncer schedules resolution for X ms from the *last* input.
  Any new inputs received before the resolver executes will reset the timer. This behavior is
  visible in e.g. a spellchecker that does not run when the user is typing above a certain speed.
  
  The throttler is appropriate to ensure responsive performance, batching elements against time;
  the debouncer is more appropriate when later inputs may render the resolution unneeded
  (thus collecting inputs into batches or logical units separated by time).
*/

/**
 * Defines a type-parameterized update function which is expected to check whether the incoming
 * user interaction (state) requires an update to the pending-resolution-state (refs).
 * @param refs A collection of React reference objects used to track real-time updates to the
 * resolution state in between firings of the resolver.
 * @param state A collection of values received from whatever caller wishes to trigger an update.
 * @returns True if the operation resulted in a change to ref value that requires scheduling
 * a resolution, else false. If the function returns true, the rate-limited function framework
 * will schedule a resolution operation if required.
 */
export type DebounceThrottleUpdater<T, TRefs> = (refs: TRefs, state: T) => boolean

/**
 * Defines a type-parameterized state resolution function which maps the pending state (refs)
 * to the external system state (e.g. a reducer) using the needed props.
 * 
 * This function is expected to set the refs (pending-resolution-state) to a neutral state, but
 * does not need to do any tracking of whether a resolution actually is pending--that's handled
 * by the framework.
 * @param refs A collection of React reference objects which track the pending-resolution state.
 * @param props An implementation-dependent set of values and functions which allow the resolver
 * to affect some external state at resolution time.
 */
export type DebounceThrottleResolver<TRefs, ResolverProps> = (refs: TRefs, props: ResolverProps) => void

// TODO: Could probably combine these into one with a version toggle

/**
 * Hook sets up the infrastructure for a throttled rate-limited function. A throttler schedules resolution
 * so that it occurs once every `timeMs` ms, as long as there is input which hasn't been resolved.
 * 
 * @param updateFn The function to call on new input from the data stream.
 * @param resolveFn The function which resolves any pending changes.
 * @param refs The set of refs which track state-pending-resolution between resolutions.
 * @param resolverProps Any additional data or functions needed for the resolver to operate.
 * @param timeMs The delay between first input and resolution. The resolve function will not fire more
 * frequently than this.
 * @returns A callback mapping an instance of state T (the user input) to void.
 */
export const useThrottler = <T, TRefs, ResolverProps>(
    updateFn: DebounceThrottleUpdater<T, TRefs>,
    resolveFn: DebounceThrottleResolver<TRefs, ResolverProps>,
    refs: TRefs,
    resolverProps: ResolverProps,
    timeMs?: number,
) => {
    const pendingRequest = useRef<number| undefined>(undefined)
    const cancelThrottled = useCallback(() => {
        if (!pendingRequest.current) return
        timeMs ? window.cancelAnimationFrame(pendingRequest.current) : window.clearTimeout(pendingRequest.current)
        pendingRequest.current = undefined
    }, [pendingRequest, timeMs])

    const resolver = useCallback((time: number) => {
        // OPTIONAL: could insert debug messages here
        resolveFn(refs, resolverProps)
        pendingRequest.current = undefined
    }, [pendingRequest, refs, resolveFn, resolverProps])

    const throttler = useCallback((state: T) => {
        const change = updateFn(refs, state)

        if (change && !(pendingRequest.current)) {
            pendingRequest.current = timeMs ? window.requestAnimationFrame(resolver) : window.setTimeout(resolver, timeMs)
        }
    }, [pendingRequest, updateFn, resolver, refs, timeMs])
    return { throttler, cancelThrottled }
}


/**
 * Hook sets up the infrastructure for a debounced rate-limited function. A debouncer schedules resolution
 * so that it does not occur until `timeMs` seconds have passed since the last unresolved input. Any new
 * input before resolution will reset the timer.
 * 
 * @param updateFn The function to call on new input from the data stream.
 * @param resolveFn The function which resolves any pending changes.
 * @param refs The set of refs which track state-pending-resolution between resolutions.
 * @param resolverProps Any additional data or functions needed for the resolver to operate.
 * @param timeMs The delay between last input and resolution. The resolve function will not execute until
 * this many seconds have passed since the last input was received.
 * @returns A callback mapping an instance of state T (the user input) to void.
 */
export const useDebouncer = <T, TRefs, ResolverProps>(
        updateFn: DebounceThrottleUpdater<T, TRefs>,
        resolveFn: DebounceThrottleResolver<TRefs, ResolverProps>,
        refs: TRefs,
        resolverProps: ResolverProps,
        timeMs?: number
    ) => {
    const time = useMemo(() => timeMs ?? 100, [timeMs]) // we don't debounce on animation frames b/c that's probably too fast
    const lastRequest = useRef<number | undefined>(undefined)
    const cancelDebouncer = useCallback(() => {
        if (!lastRequest.current) return
        window.clearTimeout(lastRequest.current)
        lastRequest.current = undefined
    }, [lastRequest])

    const resolver = useCallback((time: number) => {
        resolveFn(refs, resolverProps)
        lastRequest.current = undefined
    }, [resolveFn, refs, resolverProps])
    const debouncer = useCallback((state: T) => {
        const change = updateFn(refs, state)
        if (change) {
            if (lastRequest.current) clearTimeout(lastRequest.current)
            lastRequest.current = setTimeout(resolver, time)
        }
    }, [updateFn, refs, lastRequest, resolver, time])
    return { debouncer, cancelDebouncer }
}
