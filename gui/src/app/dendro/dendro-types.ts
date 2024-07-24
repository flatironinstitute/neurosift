import { validateObject, isArrayOf, isBoolean, isEqualTo, isNumber, isOneOf, isString, optional, isNull } from "@fi-sci/misc"

export type DendroProjectUser = {
    userId: string
    role: 'admin' | 'editor' | 'viewer'
}

export const isDendroProjectUser = (x: any): x is DendroProjectUser => {
    return validateObject(x, {
        userId: isString,
        role: isOneOf([isEqualTo('admin'), isEqualTo('editor'), isEqualTo('viewer')])
    })
}

export type DendroProject = {
    projectId: string
    name: string
    description: string
    ownerId: string
    users: DendroProjectUser[]
    publiclyReadable: boolean
    computeResourceId?: string | null
    analysisSourceUrl?: string
    tags: string[]
    timestampCreated: number
    timestampModified: number
}

export const isDendroProject = (x: any): x is DendroProject => {
    return validateObject(x, {
        projectId: isString,
        name: isString,
        description: isString,
        ownerId: isString,
        users: isArrayOf(isDendroProjectUser),
        publiclyReadable: isBoolean,
        computeResourceId: optional(isOneOf([isString, isNull])),
        analysisSourceUrl: optional(isString),
        tags: isArrayOf(isString),
        timestampCreated: isNumber,
        timestampModified: isNumber
    })
}

export type DendroJobInputFile = {
    name: string
    fileId: string
    fileName: string
    isFolder?: boolean
}

export const isDendroJobInputFile = (x: any): x is DendroJobInputFile => {
    return validateObject(x, {
        name: isString,
        fileId: isString,
        fileName: isString,
        isFolder: optional(isBoolean)
    })
}

export type DendroJobInputParameter = {
    name: string
    value?: any
    secret?: boolean
}

export const isDendroJobInputParameter = (x: any): x is DendroJobInputParameter => {
    return validateObject(x, {
        name: isString,
        value: optional(() => (true)),
        secret: optional(isBoolean)
    }, {callback: (e) => {console.warn(e);}})
}

export type DendroJobOutputFile = {
    name: string
    fileName: string
    fileId?: string
    isFolder?: boolean
}

export const isDendroJobOutputFile = (x: any): x is DendroJobOutputFile => {
    return validateObject(x, {
        name: isString,
        fileName: isString,
        fileId: optional(isString),
        isFolder: optional(isBoolean)
    })
}

export type ComputeResourceSpecProcessorParameter = {
    name: string
    description: string
    type: string
    default?: any
    options?: string[] | number[]
    secret: boolean
}

export const isComputeResourceSpecProcessorParameter = (x: any): x is ComputeResourceSpecProcessorParameter => {
    return validateObject(x, {
        name: isString,
        description: isString,
        type: isString,
        default: optional(() => (true)),
        options: optional(isArrayOf(isOneOf([isString, isNumber]))),
        secret: isBoolean
    })
}

export type ComputeResourceSpecProcessorInput = {
    name: string
    description: string
    list: boolean
}

export const isComputeResourceSpecProcessorInput = (x: any): x is ComputeResourceSpecProcessorInput => {
    return validateObject(x, {
        name: isString,
        description: isString,
        list: isBoolean
    })
}

export type ComputeResourceSpecProcessorInputFolder = {
    name: string
    description: string
    list: boolean
}

export const isComputeResourceSpecProcessorInputFolder = (x: any): x is ComputeResourceSpecProcessorInputFolder => {
    return validateObject(x, {
        name: isString,
        description: isString,
        list: isBoolean
    })
}

export type ComputeResourceSpecProcessorOutput = {
    name: string
    description: string
}

export const isComputeResourceSpecProcessorOutput = (x: any): x is ComputeResourceSpecProcessorOutput => {
    return validateObject(x, {
        name: isString,
        description: isString
    })
}

export type ComputeResourceSpecProcessorOutputFolder = {
    name: string
    description: string
}

export const isComputeResourceSpecProcessorOutputFolder = (x: any): x is ComputeResourceSpecProcessorOutputFolder => {
    return validateObject(x, {
        name: isString,
        description: isString
    })
}

export type ComputeResourceSpecProcessorAttribute = {
    name: string
    value: any
}

export const isComputeResourceSpecProcessorAttribute = (x: any): x is ComputeResourceSpecProcessorAttribute => {
    return validateObject(x, {
        name: isString,
        value: () => (true)
    })
}

export type ComputeResourceSpecProcessorTag = {
    tag: string
}

export const isComputeResourceSpecProcessorTag = (x: any): x is ComputeResourceSpecProcessorTag => {
    return validateObject(x, {
        tag: isString
    })
}

export type ComputeResourceSpecProcessor = {
    name: string
    description: string
    inputs: ComputeResourceSpecProcessorInput[]
    inputFolders?: ComputeResourceSpecProcessorInputFolder[]
    outputs: ComputeResourceSpecProcessorOutput[]
    outputFolders?: ComputeResourceSpecProcessorOutputFolder[]
    parameters: ComputeResourceSpecProcessorParameter[]
    attributes: ComputeResourceSpecProcessorAttribute[]
    tags: ComputeResourceSpecProcessorTag[]
}

export const isComputeResourceSpecProcessor = (x: any): x is ComputeResourceSpecProcessor => {
    return validateObject(x, {
        name: isString,
        description: isString,
        inputs: isArrayOf(isComputeResourceSpecProcessorInput),
        inputFolders: optional(isArrayOf(isComputeResourceSpecProcessorInputFolder)),
        outputs: isArrayOf(isComputeResourceSpecProcessorOutput),
        outputFolders: optional(isArrayOf(isComputeResourceSpecProcessorOutputFolder)),
        parameters: isArrayOf(isComputeResourceSpecProcessorParameter),
        attributes: isArrayOf(isComputeResourceSpecProcessorAttribute),
        tags: isArrayOf(isComputeResourceSpecProcessorTag)
    }, {callback: (e) => {console.warn(e);}})
}

export type DendroJobRequiredResources = {
    numCpus: number
    numGpus: number
    memoryGb: number
    timeSec: number
}

export const isDendroJobRequiredResources = (x: any): x is DendroJobRequiredResources => {
    return validateObject(x, {
        numCpus: isNumber,
        numGpus: isNumber,
        memoryGb: isNumber,
        timeSec: isNumber
    })
}

export type DendroJobUsedResources = {
    numCpus: number
    numGpus: number
    memoryGb: number
    timeSec: number
}

export const isDendroJobUsedResources = (x: any): x is DendroJobUsedResources => {
    return validateObject(x, {
        numCpus: isNumber,
        numGpus: isNumber,
        memoryGb: isNumber,
        timeSec: isNumber
    })
}

export type DendroJob = {
    projectId: string
    jobId: string
    jobPrivateKey: string
    userId: string
    processorName: string
    batchId?: string
    inputFiles: DendroJobInputFile[]
    inputFileIds: string[]
    inputParameters: DendroJobInputParameter[]
    outputFiles: DendroJobOutputFile[]
    requiredResources?: DendroJobRequiredResources
    usedResources?: DendroJobUsedResources
    runMethod?: 'local' | 'aws_batch' | 'slurm'
    timestampCreated: number
    computeResourceId: string
    status: 'pending' | 'queued' | 'starting' | 'running' | 'completed' | 'failed'
    error?: string
    processorVersion?: string
    computeResourceNodeId?: string // obsolete
    computeResourceNodeName?: string // obsolete
    consoleOutputUrl?: string
    resourceUtilizationLogUrl?: string
    timestampQueued?: number
    timestampStarting?: number
    timestampStarted?: number
    timestampFinished?: number
    outputFileIds?: string[]
    processorSpec: ComputeResourceSpecProcessor
    dandiApiKey?: string
    deleted?: boolean
    pendingApproval?: boolean
}

export const isDendroJob = (x: any): x is DendroJob => {
    return validateObject(x, {
        projectId: isString,
        jobId: isString,
        jobPrivateKey: isString,
        userId: isString,
        processorName: isString,
        batchId: optional(isString),
        inputFiles: isArrayOf(isDendroJobInputFile),
        inputFileIds: isArrayOf(isString),
        inputParameters: isArrayOf(isDendroJobInputParameter),
        outputFiles: isArrayOf(isDendroJobOutputFile),
        requiredResources: optional(isDendroJobRequiredResources),
        usedResources: optional(isDendroJobUsedResources),
        runMethod: optional(isOneOf([isEqualTo('local'), isEqualTo('aws_batch'), isEqualTo('slurm')])),
        timestampCreated: isNumber,
        computeResourceId: isString,
        status: isOneOf([isEqualTo('pending'), isEqualTo('queued'), isEqualTo('starting'), isEqualTo('running'), isEqualTo('completed'), isEqualTo('failed')]),
        error: optional(isString),
        processorVersion: optional(isString),
        computeResourceNodeId: optional(isString), // obsolete
        computeResourceNodeName: optional(isString), // obsolete
        consoleOutputUrl: optional(isString),
        resourceUtilizationLogUrl: optional(isString),
        timestampQueued: optional(isNumber),
        timestampStarting: optional(isNumber),
        timestampStarted: optional(isNumber),
        timestampFinished: optional(isNumber),
        outputFileIds: optional(isArrayOf(isString)),
        processorSpec: isComputeResourceSpecProcessor,
        dandiApiKey: optional(isString),
        deleted: optional(isBoolean),
        pendingApproval: optional(isBoolean)
    }, {callback: (e) => {console.warn(e);}})
}

export type DendroFile = {
    projectId: string
    fileId: string
    userId: string
    fileName: string
    size: number
    timestampCreated: number
    content: string
    metadata: any
    isFolder?: boolean
    jobId?: string | null
}

export const isDendroFile = (x: any): x is DendroFile => {
    return validateObject(x, {
        projectId: isString,
        fileId: isString,
        userId: isString,
        fileName: isString,
        size: isNumber,
        timestampCreated: isNumber,
        content: isString,
        metadata: () => true,
        isFolder: optional(isBoolean),
        jobId: optional(isOneOf([isString, isNull]))
    })
}

// obsolete
export type ComputeResourceAwsBatchOpts = {
    jobQueue?: string // obsolete
    jobDefinition?: string
    useAwsBatch?: boolean
}

// obsolete
export const isComputeResourceAwsBatchOpts = (x: any): x is ComputeResourceAwsBatchOpts => {
    return validateObject(x, {
        jobQueue: optional(isString), // obsolete
        jobDefinition: optional(isString),
        useAwsBatch: optional(isBoolean)
    })
}


// obsolete
export type ComputeResourceSlurmOpts = {
    partition?: string
    time?: string
    cpusPerTask?: number
    otherOpts?: string
}

// obsolete
export const isComputeResourceSlurmOpts = (x: any): x is ComputeResourceSlurmOpts => {
    return validateObject(x, {
        partition: optional(isString),
        time: optional(isString),
        cpusPerTask: optional(isNumber),
        otherOpts: optional(isString)
    })
}

export type DendroComputeResourceApp = {
    name: string
    specUri?: string
    executablePath?: string // to be removed
    container?: string // to be removed
    awsBatch?: ComputeResourceAwsBatchOpts // obsolete
    slurm?: ComputeResourceSlurmOpts // obsolete
}

export const isDendroComputeResourceApp = (x: any): x is DendroComputeResourceApp => {
    return validateObject(x, {
        name: isString,
        specUri: optional(isString),
        executablePath: optional(isString), // to be removed
        container: optional(isString), // to be removed
        awsBatch: optional(isComputeResourceAwsBatchOpts), // obsolete
        slurm: optional(isComputeResourceSlurmOpts) // obsolete
    })
}

export type ComputeResourceSpecApp = {
    name: string
    description: string
    processors: ComputeResourceSpecProcessor[]
    appImage?: string
    appExecutable?: string,
}

export const isComputeResourceSpecApp = (x: any): x is ComputeResourceSpecApp => {
    return validateObject(x, {
        name: isString,
        description: isString,
        processors: isArrayOf(isComputeResourceSpecProcessor),
        appImage: isString,
        appExecutable: isString,
    })
}

export type ComputeResourceSpec = {
    apps: ComputeResourceSpecApp[]
    defaultJobRunMethod?: 'local' | 'aws_batch' | 'slurm'
    availableJobRunMethods?: ('local' | 'aws_batch' | 'slurm')[]
}

export const isComputeResourceSpec = (x: any): x is ComputeResourceSpec => {
    return validateObject(x, {
        apps: isArrayOf(isComputeResourceSpecApp),
        defaultJobRunMethod: optional(isOneOf([isEqualTo('local'), isEqualTo('aws_batch'), isEqualTo('slurm')])),
        availableJobRunMethods: optional(isArrayOf(isOneOf([isEqualTo('local'), isEqualTo('aws_batch'), isEqualTo('slurm')]))),
    })
}

export type DendroComputeResource = {
    computeResourceId: string
    ownerId: string
    name: string
    timestampCreated: number
    apps: DendroComputeResourceApp[]
    spec?: ComputeResourceSpec
}

export const isDendroComputeResource = (x: any): x is DendroComputeResource => {
    return validateObject(x, {
        computeResourceId: isString,
        ownerId: isString,
        name: isString,
        timestampCreated: isNumber,
        apps: isArrayOf(isDendroComputeResourceApp),
        spec: optional(isComputeResourceSpec)
    })
}

export type PubsubSubscription = {
    pubnubSubscribeKey: string
    pubnubChannel: string
    pubnubUser: string
}

export const isPubsubSubscription = (x: any): x is PubsubSubscription => {
    return validateObject(x, {
        pubnubSubscribeKey: isString,
        pubnubChannel: isString,
        pubnubUser: isString
    })
}

export type ProcessorGetJobResponseInput = {
    name: string
    url: string
}

export const isProcessorGetJobResponseInput = (x: any): x is ProcessorGetJobResponseInput => {
    return validateObject(x, {
        name: isString,
        url: isString
    })
}

export type ProcessorGetJobResponseInputFolderFile = {
    name: string
    url: string
    size?: number
}

export const isProcessorGetJobResponseInputFolderFile = (x: any): x is ProcessorGetJobResponseInputFolderFile => {
    return validateObject(x, {
        name: isString,
        url: isString,
        size: optional(isNumber)
    })
}

export type ProcessorGetJobResponseInputFolder = {
    name: string
    files: ProcessorGetJobResponseInputFolderFile[]
}

export const isProcessorGetJobResponseInputFolder = (x: any): x is ProcessorGetJobResponseInputFolder => {
    return validateObject(x, {
        name: isString,
        files: isArrayOf(isProcessorGetJobResponseInputFolderFile)
    })
}

export type ProcessorGetJobResponseOutput = {
    name: string
}

export const isProcessorGetJobResponseOutput = (x: any): x is ProcessorGetJobResponseOutput => {
    return validateObject(x, {
        name: isString
    })
}

export type ProcessorGetJobResponseOutputFolder = {
    name: string
}

export const isProcessorGetJobResponseOutputFolder = (x: any): x is ProcessorGetJobResponseOutputFolder => {
    return validateObject(x, {
        name: isString
    })
}

export type ProcessorGetJobResponseParameter = {
    name: string
    value: any
}

export const isProcessorGetJobResponseParameter = (x: any): x is ProcessorGetJobResponseParameter => {
    return validateObject(x, {
        name: isString,
        value: isString
    })
}

export type ProcessorGetJobResponse = {
    jobId: string
    status: string
    processorName: string
    inputs: ProcessorGetJobResponseInput[]
    inputFolders?: ProcessorGetJobResponseInputFolder[]
    outputs: ProcessorGetJobResponseOutput[]
    outputFolders?: ProcessorGetJobResponseOutputFolder[]
    parameters: ProcessorGetJobResponseParameter[]
}

export const isProcessorGetJobResponse = (x: any): x is ProcessorGetJobResponse => {
    return validateObject(x, {
        jobId: isString,
        status: isString,
        processorName: isString,
        inputs: isArrayOf(isProcessorGetJobResponseInput),
        inputFolders: optional(isArrayOf(isProcessorGetJobResponseInputFolder)),
        outputs: isArrayOf(isProcessorGetJobResponseOutput),
        outputFolders: optional(isArrayOf(isProcessorGetJobResponseOutputFolder)),
        parameters: isArrayOf(isProcessorGetJobResponseParameter)
    })
}

export type ComputeResourceUserUsage = {
    computeResourceId: string
    userId: string
    jobsIncludingDeleted: DendroJob[]
}

export const isComputeResourceUserUsage = (x: any): x is ComputeResourceUserUsage => {
    return validateObject(x, {
        computeResourceId: isString,
        userId: isString,
        jobsIncludingDeleted: isArrayOf(isDendroJob)
    })
}
