import { Hyperlink, SmallIconButton } from "@fi-sci/misc"
import { Refresh } from "@mui/icons-material"
import { FunctionComponent, PropsWithChildren, useCallback, useEffect, useState } from "react"
import { GetJobRequest, FindJobsRequest, PairioJob, isGetJobResponse, isFindJobsResponse } from "../../../../pairio/types"
import { timeAgoString } from "../../../../timeStrings"

export const useAllJobs = (o: {appName?: string, processorName?: string, tags?: any, inputFileUrl?: string, jobFilter?: (job: PairioJob) => boolean}) => {
    const {appName, processorName, tags, inputFileUrl, jobFilter} = o
    const [allJobs, setAllJobs] = useState<PairioJob[] | undefined | null>(undefined)
    const [refreshCode, setRefreshCode] = useState(0)
    const refreshAllJobs = useCallback(() => {
        setRefreshCode(c => (c + 1))
    }, [])
    useEffect(() => {
        let canceled = false
        if (!inputFileUrl) return undefined;
        if ((!tags) && (!(processorName && appName))) return undefined;
        (async () => {
            setAllJobs(undefined)
            const req: FindJobsRequest = {
                type: 'findJobsRequest',
                serviceName: 'hello_world_service',
                appName,
                processorName,
                tags: (tags && tags.length > 0) ? {'$all': tags} : undefined,
                inputFileUrl
            }
            const headers = {
                'Content-Type': 'application/json',
            }
            const resp = await fetch('https://pairio.vercel.app/api/findJobs', {
                method: 'POST',
                headers,
                body: JSON.stringify(req)
            })
            if (canceled) return
            if (!resp.ok) {
                console.error('Error fetching jobs:', resp)
                setAllJobs(null)
                return undefined
            }
            const rr = await resp.json()
            if (!isFindJobsResponse(rr)) {
                console.error('Unexpected response:', rr)
                setAllJobs(null)
                return undefined
            }
            const jobs = jobFilter ? rr.jobs.filter(jobFilter) : rr.jobs
            setAllJobs(jobs)
        })()
        return () => { canceled = true }
    }, [appName, processorName, inputFileUrl, refreshCode, tags, jobFilter])
    return {allJobs, refreshAllJobs}
}

export const usePairioApiKey = () => {
    // save in local storage
    const [pairioApiKey, setPairioApiKey] = useState<string>('')
    useEffect(() => {
        const storedPairioApiKey = localStorage.getItem('pairioApiKey')
        if (storedPairioApiKey) {
            setPairioApiKey(storedPairioApiKey)
        }
    }, [])
    useEffect(() => {
        localStorage.setItem('pairioApiKey', pairioApiKey)
    }, [pairioApiKey])
    return { pairioApiKey, setPairioApiKey }
}

export const SelectPairioApiKeyComponent: FunctionComponent<{value: string, setValue: (value: string) => void}> = ({value, setValue}) => {
    return (
        <div>
            <label>
                <a href="https://pairio.vercel.app/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Pairio API key
                </a>:&nbsp;
            </label>
            <input type="password" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
    )
}

export const useJob = (jobId: string | undefined) => {
    const [job, setJob] = useState<PairioJob | undefined>(undefined)
    const [refreshCode, setRefreshCode] = useState(0)
    const refreshJob = useCallback(() => {
        setRefreshCode(c => (c + 1))
    }, [])
    useEffect(() => {
        if (!jobId) {
            setJob(undefined)
            return
        }
        let canceled = false
        ;(async () => {
            setJob(undefined)
            const req: GetJobRequest = {
                type: 'getJobRequest',
                jobId,
                includePrivateKey: false
            }
            const headers = {
                'Content-Type': 'application/json',
            }
            const resp = await fetch('https://pairio.vercel.app/api/getJob', {
                method: 'POST',
                headers,
                body: JSON.stringify(req)
            })
            if (canceled) return
            if (!resp.ok) {
                console.error('Error fetching job:', resp)
                return
            }
            const data = await resp.json()
            if (!isGetJobResponse(data)) {
                console.error('Unexpected response:', data)
                return
            }
            setJob(data.job)
        })()
        return () => { canceled = true }
    }, [jobId, refreshCode])
    return { job, refreshJob }
}

export const MultipleChoiceNumberSelector: FunctionComponent<{value: number, setValue: (value: number) => void, choices: number[]}> = ({value, setValue, choices}) => {
    return (
        <select value={value} onChange={(e) => setValue(parseInt(e.target.value))}>
            {choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
        </select>
    )
}

export const MultipleChoiceStringSelector: FunctionComponent<{value: string, setValue: (value: string) => void, choices: string[]}> = ({value, setValue, choices}) => {
    return (
        <select value={value} onChange={(e) => setValue(e.target.value)}>
            {choices.map(choice => <option key={choice} value={choice}>{choice}</option>)}
        </select>
    )
}

export const getJobOutputUrl = (job: PairioJob | undefined, outputName: string) => {
    if (!job) return undefined
    if (job.status !== 'completed') return undefined
    const oo = job.outputFileResults.find(r => (r.name === outputName))
    if (!oo) return undefined
    return oo.url
}

export const getJobParameterValue = (job: PairioJob | undefined, parameterName: string) => {
    if (!job) return undefined
    const pp = job.jobDefinition.parameters.find(pp => (pp.name === parameterName))
    if (!pp) return undefined
    return pp.value
}

type AllJobsViewProps = {
    expanded: boolean
    setExpanded: (expanded: boolean) => void
    allJobs: PairioJob[] | undefined
    refreshAllJobs: () => void
    parameterNames: string[]
    selectedJobId: string | undefined
    onJobClicked: (jobId: string) => void
}

export const AllJobsView: FunctionComponent<AllJobsViewProps> = ({expanded, setExpanded, allJobs, refreshAllJobs, parameterNames, onJobClicked: jobClicked, selectedJobId}) => {
    if (!allJobs) return <div></div>
    return (
        <Expandable
            title={`View all jobs (${allJobs.length})`}
            expanded={expanded}
            setExpanded={setExpanded}
        >
            <AllJobsTable
                allJobs={allJobs}
                refreshAllJobs={refreshAllJobs}
                parameterNames={parameterNames}
                selectedJobId={selectedJobId}
                onJobClicked={jobClicked}
            />
        </Expandable>
    )
}

type AllJobsTableProps = {
    allJobs: PairioJob[]
    refreshAllJobs: () => void
    parameterNames: string[]
    selectedJobId: string | undefined
    onJobClicked: (jobId: string) => void
}

const AllJobsTable: FunctionComponent<AllJobsTableProps> = ({allJobs, refreshAllJobs, parameterNames, selectedJobId, onJobClicked}) => {
    return (
        <div>
            <div>
                <SmallIconButton
                    icon={<Refresh />}
                    onClick={refreshAllJobs}
                />
            </div>
            <table className="nwb-table">
                <thead>
                    <tr>
                        <th>Job</th>
                        <th>Status</th>
                        {
                            parameterNames.map(pn => (
                                <th key={pn}>{pn}</th>
                            ))
                        }
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    {
                        allJobs.map(job => (
                            <tr key={job.jobId} style={job.jobId === selectedJobId ? {background: '#afafaf'} : {}}>
                                <td>
                                    <Hyperlink onClick={() => onJobClicked(job.jobId)}>
                                        SELECT
                                    </Hyperlink>
                                </td>
                                <td>{job.status}</td>
                                {
                                    parameterNames.map(pn => (
                                        <td key={pn}>{getJobParameter(job, pn)}</td>
                                    ))
                                }
                                <td>
                                    {timeAgoString(job.timestampCreatedSec)}
                                </td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
    )
}

const getJobParameter = (job: PairioJob, parameterName: string) => {
    const pp = job.jobDefinition.parameters.find(pp => (pp.name === parameterName))
    if (!pp) return undefined
    return pp.value
}

type ExpandableProps = {
    title: string
    expanded: boolean
    setExpanded: (expanded: boolean) => void
}

const Expandable: FunctionComponent<PropsWithChildren<ExpandableProps>> = ({title, expanded, setExpanded, children}) => {
    return (
        <div>
            <div
                style={{cursor: 'pointer', padding: 10, background: '#f8f8f8', border: 'solid 1px #ccc'}}
                onClick={() => setExpanded(!expanded)}
            >
                {expanded ? '▼' : '►'} {title}
            </div>
            {
                expanded && (
                    <div style={{padding: 10}}>
                        {children}
                    </div>
                )
            }
        </div>
    )
}

export const removeLeadingSlash = (path: string) => {
    if (path.startsWith('/')) return path.slice(1)
    return path
}