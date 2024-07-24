/* eslint-disable @typescript-eslint/no-explicit-any */
import { isArrayOf, isBoolean, isEqualTo, isNull, isNumber, isOneOf, isString, optional, validateObject } from "@fi-sci/misc";

// PairioService
export type PairioService = {
  serviceName: string
  userId: string
  users: PairioServiceUser[]
}

export const isPairioService = (x: any): x is PairioService => {
  return validateObject(x, {
    serviceName: isString,
    userId: isString,
    users: isArrayOf(isPairioServiceUser)
  })
}

// PairioServiceUser
export type PairioServiceUser = {
  userId: string
  admin: boolean
  createJobs: boolean
  processJobs: boolean
}

export const isPairioServiceUser = (x: any): x is PairioServiceUser => {
  return validateObject(x, {
    userId: isString,
    admin: isBoolean,
    createJobs: isBoolean,
    processJobs: isBoolean
  })
}

// PairioServiceApp
export type PairioServiceApp = {
  serviceName: string
  appName: string
  appSpecificationUri: string
  appSpecificationCommit: string
  appSpecification: PairioAppSpecification
}

export const isPairioServiceApp = (x: any): x is PairioServiceApp => {
  return validateObject(x, {
    serviceName: isString,
    appName: isString,
    appSpecificationUri: isString,
    appSpecificationCommit: isString,
    appSpecification: isPairioAppSpecification
  })
}

// PairioComputeClient
export type PairioComputeClient = {
  serviceNames: string[]
  computeClientId: string
  computeClientPrivateKey: string | null
  computeClientName: string // unique for service
  userId: string
  processJobsForUsers?: string[] | null // if provided and not null, only process jobs for these users
  description: string
  computeSlots: ComputeClientComputeSlot[]
  timestampLastActiveSec?: number
}

export const isPairioComputeClient = (x: any): x is PairioComputeClient => {
  return validateObject(x, {
    serviceNames: isArrayOf(isString),
    computeClientId: isString,
    computeClientPrivateKey: isOneOf([isString, isNull]),
    computeClientName: isString,
    userId: isString,
    processJobsForUsers: optional(isOneOf([isArrayOf(isString), isNull])),
    description: isString,
    computeSlots: isArrayOf(isComputeClientComputeSlot),
    timestampLastActiveSec: optional(isNumber),
    lastAccessedSec: optional(isNumber) // to remove in future
  })
}

// PairioAppProcessorAttribute
export type PairioAppProcessorAttribute = {
  name: string
  value: string | number | boolean | string[] | number[] | boolean[]
}

export const isPairioAppProcessorAttribute = (x: any): x is PairioAppProcessorAttribute => {
  return validateObject(x, {
    name: isString,
    value: isOneOf([isString, isNumber, isBoolean, isArrayOf(isString), isArrayOf(isNumber), isArrayOf(isBoolean)])
  })
}

// PairioAppProcessor
export type PairioAppProcessor = {
  name: string
  description: string
  label: string
  image: string
  executable: string
  inputs: PairioAppProcessorInputFile[]
  outputs: PairioAppProcessorOutputFile[]
  parameters: PairioAppProcessorParameter[]
  attributes: PairioAppProcessorAttribute[]
}

export const isPairioAppProcessor = (x: any): x is PairioAppProcessor => {
  return validateObject(x, {
    name: isString,
    description: isString,
    label: isString,
    image: isString,
    executable: isString,
    inputs: isArrayOf(isPairioAppProcessorInputFile),
    outputs: isArrayOf(isPairioAppProcessorOutputFile),
    parameters: isArrayOf(isPairioAppProcessorParameter),
    attributes: isArrayOf(isPairioAppProcessorAttribute)
  }, {callback: console.log})
}

// PairioAppSpecification
export type PairioAppSpecification = {
  name: string
  description: string
  processors: PairioAppProcessor[]
}

export const isPairioAppSpecification = (x: any): x is PairioAppSpecification => {
  return validateObject(x, {
    name: isString,
    description: isString,
    processors: isArrayOf(isPairioAppProcessor)
  }, {callback: console.log})
}

// PairioJobInputFile
export type PairioJobInputFile = {
  name: string
  fileBaseName: string
  url: string
}

export const isPairioJobInputFile = (x: any): x is PairioJobInputFile => {
  return validateObject(x, {
    name: isString,
    fileBaseName: isString,
    url: isString
  })
}

// PairioJobOutputFile
export type PairioJobOutputFile = {
  name: string
  fileBaseName: string
}

export const isPairioJobOutputFile = (x: any): x is PairioJobOutputFile => {
  return validateObject(x, {
    name: isString,
    fileBaseName: isString
  })
}

// PairioJobParameter
export type PairioJobParameter = {
  name: string
  value: string | number | boolean | string[] | number[] | boolean[] | null // null means undefined
}

export const isPairioJobParameter = (x: any): x is PairioJobParameter => {
  return validateObject(x, {
    name: isString,
    value: isOneOf([isString, isNumber, isBoolean, isArrayOf(isString), isArrayOf(isNumber), isArrayOf(isBoolean), isNull])
  })
}

// PairioJobRequiredResources
export type PairioJobRequiredResources = {
  numCpus: number
  numGpus: number
  memoryGb: number
  timeSec: number
}

export const isPairioJobRequiredResources = (x: any): x is PairioJobRequiredResources => {
  return validateObject(x, {
    numCpus: isNumber,
    numGpus: isNumber,
    memoryGb: isNumber,
    timeSec: isNumber
  })
}

// PairioJobSecret
export type PairioJobSecret = {
  name: string
  value: string
}

export const isPairioJobSecret = (x: any): x is PairioJobSecret => {
  return validateObject(x, {
    name: isString,
    value: isString
  })
}

// PairioJobStatus
export type PairioJobStatus = 'pending' | 'starting' | 'running' | 'completed' | 'failed'

export const isPairioJobStatus = (x: any): x is PairioJobStatus => {
  return isOneOf(['pending', 'starting', 'running', 'completed', 'failed'].map(isEqualTo))(x)
}

// PairioJobDefinition
export type PairioJobDefinition = {
  appName: string
  processorName: string
  inputFiles: PairioJobInputFile[]
  outputFiles: PairioJobOutputFile[]
  parameters: PairioJobParameter[]
  cacheBust?: string
}

export const isPairioJobDefinition = (x: any): x is PairioJobDefinition => {
  return validateObject(x, {
    appName: isString,
    processorName: isString,
    inputFiles: isArrayOf(isPairioJobInputFile),
    outputFiles: isArrayOf(isPairioJobOutputFile),
    parameters: isArrayOf(isPairioJobParameter),
    cacheBust: optional(isString)
  })
}

export type PairioJobOutputFileResult = {
  name: string
  fileBaseName: string
  url: string
  size: number | null
}

export const isPairioJobOutputFileResult = (x: any): x is PairioJobOutputFileResult => {
  return validateObject(x, {
    name: isString,
    fileBaseName: isString,
    url: isString,
    size: isOneOf([isNumber, isNull])
  })
}

export type PairioJobOtherFileOutput = {
  name: string
  url: string
}

export const isPairioJobOtherFileOutput = (x: any): x is PairioJobOtherFileOutput => {
  return validateObject(x, {
    name: isString,
    url: isString
  })
}

// PairioJob
export type PairioJob = {
  jobId: string
  jobPrivateKey: string | null
  serviceName: string
  userId: string
  batchId: string
  tags: string[]
  jobDefinition: PairioJobDefinition
  jobDefinitionHash: string
  jobDependencies: string[]
  requiredResources: PairioJobRequiredResources
  secrets: PairioJobSecret[] | null
  inputFileUrlList: string[]
  outputFileUrlList: string[]
  outputFileResults: PairioJobOutputFileResult[]
  otherFileOutputs?: PairioJobOtherFileOutput[]
  consoleOutputUrl: string
  resourceUtilizationLogUrl: string
  timestampCreatedSec: number
  timestampStartingSec: number | null
  timestampStartedSec: number | null
  timestampFinishedSec: number | null
  canceled: boolean
  status: PairioJobStatus
  isRunnable: boolean
  error?: string | null
  computeClientId: string | null
  computeClientName: string | null
  computeClientUserId: string | null
  imageUri: string | null
}

export const isPairioJob = (x: any): x is PairioJob => {
  return validateObject(x, {
    jobId: isString,
    jobPrivateKey: isOneOf([isString, isNull]),
    serviceName: isString,
    userId: isString,
    batchId: isString,
    tags: isArrayOf(isString),
    jobDefinition: isPairioJobDefinition,
    jobDefinitionHash: isString,
    jobDependencies: isArrayOf(isString),
    requiredResources: isPairioJobRequiredResources,
    secrets: isOneOf([isArrayOf(isPairioJobSecret), isNull]),
    inputFileUrlList: isArrayOf(isString),
    outputFileUrlList: isArrayOf(isString),
    outputFileResults: isArrayOf(isPairioJobOutputFileResult),
    otherFileOutputs: optional(isArrayOf(isPairioJobOtherFileOutput)),
    consoleOutputUrl: isString,
    resourceUtilizationLogUrl: isString,
    timestampCreatedSec: isNumber,
    timestampStartingSec: isOneOf([isNumber, isNull]),
    timestampStartedSec: isOneOf([isNumber, isNull]),
    timestampFinishedSec: isOneOf([isNumber, isNull]),
    canceled: isBoolean,
    status: isPairioJobStatus,
    isRunnable: isBoolean,
    error: optional(isOneOf([isString, isNull])),
    computeClientId: isOneOf([isString, isNull]),
    computeClientName: isOneOf([isString, isNull]),
    computeClientUserId: isOneOf([isString, isNull]),
    imageUri: isOneOf([isString, isNull])
  })
}

// PairioAppProcessorInputFile
export type PairioAppProcessorInputFile = {
  name: string
  description: string
  list?: boolean
}

export const isPairioAppProcessorInputFile = (x: any): x is PairioAppProcessorInputFile => {
  return validateObject(x, {
    name: isString,
    description: isString,
    list: optional(isBoolean)
  })
}

// PairioAppProcessorOutputFile
export type PairioAppProcessorOutputFile = {
  name: string
  description: string
}

export const isPairioAppProcessorOutputFile = (x: any): x is PairioAppProcessorOutputFile => {
  return validateObject(x, {
    name: isString,
    description: isString
  })
}

// PairioAppProcessorParameterTypes
export type PairioAppProcessorParameterTypes = 'str' | 'int' | 'float' | 'bool' | 'List[str]' | 'List[int]' | 'List[float]' | 'Optional[str]' | 'Optional[int]' | 'Optional[float]' | 'Optional[bool]'

export const isPairioAppProcessorParameterTypes = (x: any): x is PairioAppProcessorParameterTypes => {
  return isOneOf(['str', 'int', 'float', 'bool', 'List[str]', 'List[int]', 'List[float]', 'Optional[str]', 'Optional[int]', 'Optional[float]', 'Optional[bool]'].map(isEqualTo))(x)
}

// PairioAppProcessorParameter
export type PairioAppProcessorParameter = {
  name: string
  type: PairioAppProcessorParameterTypes
  description: string
  defaultValue?: string | number | boolean | string[] | number[]
  options?: any[]
}

export const isPairioAppProcessorParameter = (x: any): x is PairioAppProcessorParameter => {
  return validateObject(x, {
    name: isString,
    type: isPairioAppProcessorParameterTypes,
    description: isString,
    defaultValue: optional(isOneOf([isString, isNumber, isBoolean, isArrayOf(isString), isArrayOf(isNumber)])),
    options: optional(isArrayOf(() => true))
  }, {callback: console.log})
}

// ComputeClientComputeSlot
export type ComputeClientComputeSlot = {
  numCpus: number
  numGpus: number
  memoryGb: number
  timeSec: number
  minNumCpus: number
  minNumGpus: number
  minMemoryGb: number
  minTimeSec: number
  multiplicity: number
}

export const isComputeClientComputeSlot = (x: any): x is ComputeClientComputeSlot => {
  return validateObject(x, {
    numCpus: isNumber,
    numGpus: isNumber,
    memoryGb: isNumber,
    timeSec: isNumber,
    minNumCpus: isNumber,
    minNumGpus: isNumber,
    minMemoryGb: isNumber,
    minTimeSec: isNumber,
    multiplicity: isNumber
  })
}

// PairioUser
export type PairioUser = {
  userId: string
  name: string
  email: string
  apiKey: string | null
}

export const isPairioUser = (x: any): x is PairioUser => {
  return validateObject(x, {
    userId: isString,
    name: isString,
    email: isString,
    apiKey: isOneOf([isString, isNull])
  })
}

// addUser
export type AddUserRequest = {
  type: 'addUserRequest'
  userId: string
}

export const isAddUserRequest = (x: any): x is AddUserRequest => {
  return validateObject(x, {
    type: isEqualTo('addUserRequest'),
    user: isString
  })
}

export type AddUserResponse = {
  type: 'addUserResponse'
}

export const isAddUserResponse = (x: any): x is AddUserResponse => {
  return validateObject(x, {
    type: isEqualTo('addUserResponse')
  })
}

// resetUserApiKey
export type ResetUserApiKeyRequest = {
  type: 'resetUserApiKeyRequest'
  userId: string
}

export const isResetUserApiKeyRequest = (x: any): x is ResetUserApiKeyRequest => {
  return validateObject(x, {
    type: isEqualTo('resetUserApiKeyRequest'),
    userId: isString
  })
}

export type ResetUserApiKeyResponse = {
  type: 'resetUserApiKeyResponse'
  apiKey: string
}

export const isResetUserApiKeyResponse = (x: any): x is ResetUserApiKeyResponse => {
  return validateObject(x, {
    type: isEqualTo('resetUserApiKeyResponse'),
    apiKey: isString
  })
}

// setUserInfo
export type SetUserInfoRequest = {
  type: 'setUserInfoRequest'
  userId: string
  name?: string
  email?: string
}

export const isSetUserInfoRequest = (x: any): x is SetUserInfoRequest => {
  return validateObject(x, {
    type: isEqualTo('setUserInfoRequest'),
    userId: isString,
    name: optional(isString),
    email: optional(isString)
  })
}

export type SetUserInfoResponse = {
  type: 'setUserInfoResponse'
}

export const isSetUserInfoResponse = (x: any): x is SetUserInfoResponse => {
  return validateObject(x, {
    type: isEqualTo('setUserInfoResponse')
  })
}

// addService
export type AddServiceRequest = {
  type: 'addServiceRequest'
  serviceName: string
  userId: string
}

export const isAddServiceRequest = (x: any): x is AddServiceRequest => {
  return validateObject(x, {
    type: isEqualTo('addServiceRequest'),
    serviceName: isString,
    userId: isString
  })
}

export type AddServiceResponse = {
  type: 'addServiceResponse'
}

export const isAddServiceResponse = (x: any): x is AddServiceResponse => {
  return validateObject(x, {
    type: isEqualTo('addServiceResponse')
  })
}

// getService
export type GetServiceRequest = {
  type: 'getServiceRequest'
  serviceName: string
}

export const isGetServiceRequest = (x: any): x is GetServiceRequest => {
  return validateObject(x, {
    type: isEqualTo('getServiceRequest'),
    serviceName: isString
  })
}

export type GetServiceResponse = {
  type: 'getServiceResponse'
  service: PairioService
}

export const isGetServiceResponse = (x: any): x is GetServiceResponse => {
  return validateObject(x, {
    type: isEqualTo('getServiceResponse'),
    service: isPairioService
  })
}

// getServices
export type GetServicesRequest = {
  type: 'getServicesRequest'
  userId?: string
}

export const isGetServicesRequest = (x: any): x is GetServicesRequest => {
  return validateObject(x, {
    type: isEqualTo('getServicesRequest'),
    userId: optional(isString)
  })
}

export type GetServicesResponse = {
  type: 'getServicesResponse'
  services: PairioService[]
}

export const isGetServicesResponse = (x: any): x is GetServicesResponse => {
  return validateObject(x, {
    type: isEqualTo('getServicesResponse'),
    services: isArrayOf(isPairioService)
  })
}

// deleteService
export type DeleteServiceRequest = {
  type: 'deleteServiceRequest'
  serviceName: string
}

export const isDeleteServiceRequest = (x: any): x is DeleteServiceRequest => {
  return validateObject(x, {
    type: isEqualTo('deleteServiceRequest'),
    serviceName: isString
  })
}

export type DeleteServiceResponse = {
  type: 'deleteServiceResponse'
}

export const isDeleteServiceResponse = (x: any): x is DeleteServiceResponse => {
  return validateObject(x, {
    type: isEqualTo('deleteServiceResponse')
  })
}

// setServiceInfo
export type SetServiceInfoRequest = {
  type: 'setServiceInfoRequest'
  serviceName: string
  users?: PairioServiceUser[]
}

export const isSetServiceInfoRequest = (x: any): x is SetServiceInfoRequest => {
  return validateObject(x, {
    type: isEqualTo('setServiceInfoRequest'),
    serviceName: isString,
    users: optional(isArrayOf(isPairioServiceUser))
  })
}

export type SetServiceInfoResponse = {
  type: 'setServiceInfoResponse'
}

export const isSetServiceInfoResponse = (x: any): x is SetServiceInfoResponse => {
  return validateObject(x, {
    type: isEqualTo('setServiceInfoResponse')
  })
}

// createJob
export type CreateJobRequest = {
  type: 'createJobRequest'
  serviceName: string
  userId: string
  batchId: string
  tags: string[]
  jobDefinition: PairioJobDefinition
  requiredResources: PairioJobRequiredResources
  secrets: PairioJobSecret[]
  jobDependencies: string[]
  skipCache?: boolean
  rerunFailing?: boolean
  deleteFailing?: boolean
}

export const isCreateJobRequest = (x: any): x is CreateJobRequest => {
  return validateObject(x, {
    type: isEqualTo('createJobRequest'),
    serviceName: isString,
    userId: isString,
    batchId: isString,
    tags: isArrayOf(isString),
    jobDefinition: isPairioJobDefinition,
    requiredResources: isPairioJobRequiredResources,
    secrets: isArrayOf(isPairioJobSecret),
    jobDependencies: isArrayOf(isString),
    skipCache: optional(isBoolean),
    rerunFailing: optional(isBoolean),
    deleteFailing: optional(isBoolean)
  })
}

export type CreateJobResponse = {
  type: 'createJobResponse'
  job: PairioJob
}

export const isCreateJobResponse = (x: any): x is CreateJobResponse => {
  return validateObject(x, {
    type: isEqualTo('createJobResponse'),
    job: isPairioJob
  })
}

// findJobByDefinition
export type FindJobByDefinitionRequest = {
  type: 'findJobByDefinitionRequest'
  serviceName: string
  jobDefinition: PairioJobDefinition
}

export const isFindJobByDefinitionRequest = (x: any): x is FindJobByDefinitionRequest => {
  return validateObject(x, {
    type: isEqualTo('findJobByDefinitionRequest'),
    serviceName: isString,
    jobDefinition: isPairioJobDefinition
  })
}

export type FindJobByDefinitionResponse = {
  type: 'findJobByDefinitionResponse'
  found: boolean
  job?: PairioJob
}

export const isFindJobByDefinitionResponse = (x: any): x is FindJobByDefinitionResponse => {
  return validateObject(x, {
    type: isEqualTo('findJobByDefinitionResponse'),
    found: isBoolean,
    job: optional(isPairioJob)
  })
}

// deleteJobs
export type DeleteJobsRequest = {
  type: 'deleteJobsRequest'
  userId: string
  jobIds: string[]
}

export const isDeleteJobsRequest = (x: any): x is DeleteJobsRequest => {
  return validateObject(x, {
    type: isEqualTo('deleteJobsRequest'),
    userId: isString,
    jobIds: isArrayOf(isString)
  })
}

export type DeleteJobsResponse = {
  type: 'deleteJobsResponse'
}

export const isDeleteJobsResponse = (x: any): x is DeleteJobsResponse => {
  return validateObject(x, {
    type: isEqualTo('deleteJobsResponse')
  })
}

// findJobs
export type FindJobsRequest = {
  type: 'findJobsRequest'
  userId?: string
  jobId?: string
  processorName?: string
  computeClientId?: string
  batchId?: string
  tags?: any
  serviceName?: string
  appName?: string
  inputFileUrl?: string
  outputFileUrl?: string
  status?: PairioJobStatus | PairioJobStatus[]
  limit?: number
}

export const isFindJobsRequest = (x: any): x is FindJobsRequest => {
  return validateObject(x, {
    type: isEqualTo('findJobsRequest'),
    userId: optional(isString),
    jobId: optional(isString),
    processorName: optional(isString),
    computeClientId: optional(isString),
    batchId: optional(isString),
    tags: optional(() => true),
    serviceName: optional(isString),
    appName: optional(isString),
    inputFileUrl: optional(isString),
    outputFileUrl: optional(isString),
    status: optional(isOneOf([isPairioJobStatus, isArrayOf(isPairioJobStatus)])),
    limit: optional(isNumber)
  })
}

export type FindJobsResponse = {
  type: 'findJobsResponse'
  jobs: PairioJob[]
}

export const isFindJobsResponse = (x: any): x is FindJobsResponse => {
  return validateObject(x, {
    type: isEqualTo('findJobsResponse'),
    jobs: isArrayOf(isPairioJob)
  })
}

// getRunnableJobsForComputeClient
export type GetRunnableJobsForComputeClientRequest = {
  type: 'getRunnableJobsForComputeClientRequest'
  computeClientId: string
}

export const isGetRunnableJobsForComputeClientRequest = (x: any): x is GetRunnableJobsForComputeClientRequest => {
  return validateObject(x, {
    type: isEqualTo('getRunnableJobsForComputeClientRequest'),
    computeClientId: isString
  })
}

export type GetRunnableJobsForComputeClientResponse = {
  type: 'getRunnableJobsForComputeClientResponse'
  runnableJobs: PairioJob[]
  runningJobs: PairioJob[]
}

export const isGetRunnableJobsForComputeClientResponse = (x: any): x is GetRunnableJobsForComputeClientResponse => {
  return validateObject(x, {
    type: isEqualTo('getRunnableJobsForComputeClientResponse'),
    runnableJobs: isArrayOf(isPairioJob),
    runningJobs: isArrayOf(isPairioJob)
  })
}

// getJob
export type GetJobRequest = {
  type: 'getJobRequest'
  jobId: string
  includePrivateKey: boolean
  computeClientId?: string
}

export const isGetJobRequest = (x: any): x is GetJobRequest => {
  return validateObject(x, {
    type: isEqualTo('getJobRequest'),
    jobId: isString,
    includePrivateKey: isBoolean,
    computeClientId: optional(isString)
  })
}

export type GetJobResponse = {
  type: 'getJobResponse'
  job: PairioJob
}

export const isGetJobResponse = (x: any): x is GetJobResponse => {
  return validateObject(x, {
    type: isEqualTo('getJobResponse'),
    job: isPairioJob
  })
}

// cancelJob
export type CancelJobRequest = {
  type: 'cancelJobRequest'
  jobId: string
}

export const isCancelJobRequest = (x: any): x is CancelJobRequest => {
  return validateObject(x, {
    type: isEqualTo('cancelJobRequest'),
    jobId: isString
  })
}

export type CancelJobResponse = {
  type: 'cancelJobResponse'
}

export const isCancelJobResponse = (x: any): x is CancelJobResponse => {
  return validateObject(x, {
    type: isEqualTo('cancelJobResponse')
  })
}

// setJobStatus
export type SetJobStatusRequest = {
  type: 'setJobStatusRequest'
  jobId: string
  computeClientId: string
  status: PairioJobStatus
  error?: string
}

export const isSetJobStatusRequest = (x: any): x is SetJobStatusRequest => {
  return validateObject(x, {
    type: isEqualTo('setJobStatusRequest'),
    jobId: isString,
    computeClientId: isString,
    status: isPairioJobStatus,
    error: optional(isString)
  })
}

export type SetJobStatusResponse = {
  type: 'setJobStatusResponse'
}

export const isSetJobStatusResponse = (x: any): x is SetJobStatusResponse => {
  return validateObject(x, {
    type: isEqualTo('setJobStatusResponse')
  })
}

// getSignedUploadUrl
export type GetSignedUploadUrlRequest = {
  type: 'getSignedUploadUrlRequest'
  jobId: string
  uploadType: 'output' | 'consoleOutput' | 'resourceUtilizationLog' | 'other'
  outputName?: string
  otherName?: string
  size: number
}

export const isGetSignedUploadUrlRequest = (x: any): x is GetSignedUploadUrlRequest => {
  return validateObject(x, {
    type: isEqualTo('getSignedUploadUrlRequest'),
    jobId: isString,
    uploadType: isOneOf(['output', 'consoleOutput', 'resourceUtilizationLog', 'other'].map(isEqualTo)),
    outputName: optional(isString),
    otherName: optional(isString),
    size: isNumber,
    fallbackFileBaseName: optional(isString) // historic -- to remove
  })
}

export type GetSignedUploadUrlResponse = {
  type: 'getSignedUploadUrlResponse'
  signedUrl: string
  downloadUrl: string
}

export const isGetSignedUploadUrlResponse = (x: any): x is GetSignedUploadUrlResponse => {
  return validateObject(x, {
    type: isEqualTo('getSignedUploadUrlResponse'),
    signedUrl: isString,
    downloadUrl: isString
  })
}

// createComputeClient
export type CreateComputeClientRequest = {
  type: 'createComputeClientRequest'
  serviceNames: string[]
  computeClientName: string
  userId: string
}

export const isCreateComputeClientRequest = (x: any): x is CreateComputeClientRequest => {
  return validateObject(x, {
    type: isEqualTo('createComputeClientRequest'),
    serviceNames: isArrayOf(isString),
    computeClientName: isString,
    userId: isString
  })
}

export type CreateComputeClientResponse = {
  type: 'createComputeClientResponse'
  computeClientId: string
  computeClientPrivateKey: string
}

export const isCreateComputeClientResponse = (x: any): x is CreateComputeClientResponse => {
  return validateObject(x, {
    type: isEqualTo('createComputeClientResponse'),
    computeClientId: isString,
    computeClientPrivateKey: isString
  })
}

// deleteComputeClient
export type DeleteComputeClientRequest = {
  type: 'deleteComputeClientRequest'
  computeClientId: string
}

export const isDeleteComputeClientRequest = (x: any): x is DeleteComputeClientRequest => {
  return validateObject(x, {
    type: isEqualTo('deleteComputeClientRequest'),
    computeClientId: isString
  })
}

export type DeleteComputeClientResponse = {
  type: 'deleteComputeClientResponse'
}

export const isDeleteComputeClientResponse = (x: any): x is DeleteComputeClientResponse => {
  return validateObject(x, {
    type: isEqualTo('deleteComputeClientResponse')
  })
}

// getComputeClient
export type GetComputeClientRequest = {
  type: 'getComputeClientRequest'
  computeClientId: string
}

export const isGetComputeClientRequest = (x: any): x is GetComputeClientRequest => {
  return validateObject(x, {
    type: isEqualTo('getComputeClientRequest'),
    computeClientId: isString
  })
}

export type GetComputeClientResponse = {
  type: 'getComputeClientResponse'
  computeClient: PairioComputeClient
}

export const isGetComputeClientResponse = (x: any): x is GetComputeClientResponse => {
  return validateObject(x, {
    type: isEqualTo('getComputeClientResponse'),
    computeClient: isPairioComputeClient
  })
}

// getComputeClients
export type GetComputeClientsRequest = {
  type: 'getComputeClientsRequest'
  serviceName?: string
}

export const isGetComputeClientsRequest = (x: any): x is GetComputeClientsRequest => {
  return validateObject(x, {
    type: isEqualTo('getComputeClientsRequest'),
    serviceName: optional(isString)
  })
}

export type GetComputeClientsResponse = {
  type: 'getComputeClientsResponse'
  computeClients: PairioComputeClient[]
}

export const isGetComputeClientsResponse = (x: any): x is GetComputeClientsResponse => {
  return validateObject(x, {
    type: isEqualTo('getComputeClientsResponse'),
    computeClients: isArrayOf(isPairioComputeClient)
  })
}

// setComputeClientInfo
export type SetComputeClientInfoRequest = {
  type: 'setComputeClientInfoRequest'
  computeClientId: string
  serviceNames?: string[]
  computeClientName?: string
  description?: string
  computeSlots?: ComputeClientComputeSlot[]
  processJobsForUsers?: string[] | null
}

export const isSetComputeClientInfoRequest = (x: any): x is SetComputeClientInfoRequest => {
  return validateObject(x, {
    type: isEqualTo('setComputeClientInfoRequest'),
    computeClientId: isString,
    serviceNames: optional(isArrayOf(isString)),
    computeClientName: optional(isString),
    description: optional(isString),
    computeSlots: optional(isArrayOf(isComputeClientComputeSlot)),
    processJobsForUsers: optional(isOneOf([isArrayOf(isString), isNull]))
  })
}

export type SetComputeClientInfoResponse = {
  type: 'setComputeClientInfoResponse'
}

export const isSetComputeClientInfoResponse = (x: any): x is SetComputeClientInfoResponse => {
  return validateObject(x, {
    type: isEqualTo('setComputeClientInfoResponse')
  })
}

// addServiceApp
export type AddServiceAppRequest = {
  type: 'addServiceAppRequest'
  serviceApp: PairioServiceApp
}

export const isAddServiceAppRequest = (x: any): x is AddServiceAppRequest => {
  return validateObject(x, {
    type: isEqualTo('addServiceAppRequest'),
    serviceApp: isPairioServiceApp
  })
}

export type AddServiceAppResponse = {
  type: 'addServiceAppResponse'
}

export const isAddServiceAppResponse = (x: any): x is AddServiceAppResponse => {
  return validateObject(x, {
    type: isEqualTo('addServiceAppResponse')
  })
}

// setServiceAppInfo
export type SetServiceAppInfoRequest = {
  type: 'setServiceAppInfoRequest'
  serviceName: string
  appName: string
  appSpecificationUri?: string
  appSpecificationCommit?: string
  appSpecification?: PairioAppSpecification
}

export const isSetServiceAppInfoRequest = (x: any): x is SetServiceAppInfoRequest => {
  return validateObject(x, {
    type: isEqualTo('setServiceAppInfoRequest'),
    serviceName: isString,
    appName: isString,
    appSpecificationUri: optional(isString),
    appSpecificationCommit: optional(isString),
    appSpecification: optional(isPairioAppSpecification)
  })
}

export type SetServiceAppInfoResponse = {
  type: 'setServiceAppInfoResponse'
}

export const isSetServiceAppInfoResponse = (x: any): x is SetServiceAppInfoResponse => {
  return validateObject(x, {
    type: isEqualTo('setServiceAppInfoResponse')
  })
}

// getServiceApp
export type GetServiceAppRequest = {
  type: 'getServiceAppRequest'
  serviceName: string
  appName: string
}

export const isGetServiceAppRequest = (x: any): x is GetServiceAppRequest => {
  return validateObject(x, {
    type: isEqualTo('getServiceAppRequest'),
    serviceName: isString,
    appName: isString
  })
}

export type GetServiceAppResponse = {
  type: 'getServiceAppResponse'
  serviceApp: PairioServiceApp
}

export const isGetServiceAppResponse = (x: any): x is GetServiceAppResponse => {
  return validateObject(x, {
    type: isEqualTo('getServiceAppResponse'),
    serviceApp: isPairioServiceApp
  })
}

// deleteApp
export type DeleteServiceAppRequest = {
  type: 'deleteServiceAppRequest'
  serviceName: string
  appName: string
}

export const isDeleteServiceAppRequest = (x: any): x is DeleteServiceAppRequest => {
  return validateObject(x, {
    type: isEqualTo('deleteServiceAppRequest'),
    serviceName: isString,
    appName: isString
  })
}

export type DeleteServiceAppResponse = {
  type: 'deleteServiceAppResponse'
}

export const isDeleteServiceAppResponse = (x: any): x is DeleteServiceAppResponse => {
  return validateObject(x, {
    type: isEqualTo('deleteServiceAppResponse')
  })
}

// getServiceApps
export type GetServiceAppsRequest = {
  type: 'getServiceAppsRequest'
  appName?: string
  serviceName?: string
}

export const isGetServiceAppsRequest = (x: any): x is GetServiceAppsRequest => {
  return validateObject(x, {
    type: isEqualTo('getServiceAppsRequest'),
    appName: optional(isString),
    serviceName: optional(isString)
  })
}

export type GetServiceAppsResponse = {
  type: 'getServiceAppsResponse'
  serviceApps: PairioServiceApp[]
}

export const isGetServiceAppsResponse = (x: any): x is GetServiceAppsResponse => {
  return validateObject(x, {
    type: isEqualTo('getServiceAppsResponse'),
    serviceApps: isArrayOf(isPairioServiceApp)
  })
}

// getPubsubSubscription
export type GetPubsubSubscriptionRequest = {
  type: 'getPubsubSubscriptionRequest'
  computeClientId?: string
}

export const isGetPubsubSubscriptionRequest = (x: any): x is GetPubsubSubscriptionRequest => {
  return validateObject(x, {
    type: isEqualTo('getPubsubSubscriptionRequest'),
    computeClientId: optional(isString)
  })
}

export type GetPubsubSubscriptionResponse = {
  type: 'getPubsubSubscriptionResponse'
  subscription: any
}

export const isGetPubsubSubscriptionResponse = (x: any): x is GetPubsubSubscriptionResponse => {
  return validateObject(x, {
    type: isEqualTo('getPubsubSubscriptionResponse'),
    subscription: () => true
  })
}

// pingComputeClients
export type PingComputeClientsRequest = {
  type: 'pingComputeClientsRequest'
  serviceName: string
}

export const isPingComputeClientsRequest = (x: any): x is PingComputeClientsRequest => {
  return validateObject(x, {
    type: isEqualTo('pingComputeClientsRequest'),
    serviceName: isString
  })
}

export type PingComputeClientsResponse = {
  type: 'pingComputeClientsResponse'
}

export const isPingComputeClientsResponse = (x: any): x is PingComputeClientsResponse => {
  return validateObject(x, {
    type: isEqualTo('pingComputeClientsResponse')
  })
}

// computeUserStats
export type ComputeUserStatsRequest = {
  type: 'computeUserStatsRequest'
  userId: string
}

export const isComputeUserStatsRequest = (x: any): x is ComputeUserStatsRequest => {
  return validateObject(x, {
    type: isEqualTo('computeUserStatsRequest'),
    userId: isString
  })
}

export type UserStats = {
  userId: string
  consumed: {
    numJobs: number
    cpuHours: number
    gpuHours: number
    gbHours: number
    jobHours: number
  }
  provided: {
    numJobs: number
    cpuHours: number
    gpuHours: number
    gbHours: number
    jobHours: number
  }
  consumedDeleted: {
    numJobs: number
    cpuHours: number
    gpuHours: number
    gbHours: number
    jobHours: number
  }
  providedDeleted: {
    numJobs: number
    cpuHours: number
    gpuHours: number
    gbHours: number
    jobHours: number
  }
}

const isUserStats = (x: any): x is UserStats => {
  if (!validateObject(x, {
    userId: isString,
    consumed: () => true,
    provided: () => true,
    consumedDeleted: () => true,
    providedDeleted: () => true,
  })) return false
  if (!validateObject(x.consumed, {
    numJobs: isNumber,
    cpuHours: isNumber,
    gpuHours: isNumber,
    gbHours: isNumber,
    jobHours: isNumber
  })) return false
  if (!validateObject(x.provided, {
    numJobs: isNumber,
    cpuHours: isNumber,
    gpuHours: isNumber,
    gbHours: isNumber,
    jobHours: isNumber
  })) return false
  if (!validateObject(x.consumedDeleted, {
    numJobs: isNumber,
    cpuHours: isNumber,
    gpuHours: isNumber,
    gbHours: isNumber,
    jobHours: isNumber
  })) return false
  if (!validateObject(x.providedDeleted, {
    numJobs: isNumber,
    cpuHours: isNumber,
    gpuHours: isNumber,
    gbHours: isNumber,
    jobHours: isNumber
  })) return false
  return true
}

export type ComputeUserStatsResponse = {
  type: 'computeUserStatsResponse'
  userStats: UserStats
}

export const isComputeUserStatsResponse = (x: any): x is ComputeUserStatsResponse => {
  return validateObject(x, {
    type: isEqualTo('computeUserStatsResponse'),
    userStats: isUserStats
  })
}