import { createContext, useContext } from "react"

type RtcshareConnectionContextValue = {
    rtcshareUrl: string
    rtcshareAvailable: boolean | undefined
}

export const useRtcshareConnection = () => {
    const context = useContext(RtcshareConnectionContext)
    if (context === null) {
        throw new Error("useRtcshareConnection must be used within a RtcshareConnectionContextProvider")
    }
    return context
}

export const RtcshareConnectionContext = createContext<RtcshareConnectionContextValue | null>(null)