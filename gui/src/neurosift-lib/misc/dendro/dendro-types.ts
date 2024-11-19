/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  isArrayOf,
  isBoolean,
  isEqualTo,
  isNull,
  isNumber,
  isOneOf,
  isString,
  optional,
  validateObject,
} from "@fi-sci/misc";

// DendroService
export type DendroService = {
  serviceName: string;
  userId: string;
  users: DendroServiceUser[];
};

export const isDendroService = (x: any): x is DendroService => {
  return validateObject(x, {
    serviceName: isString,
    userId: isString,
    users: isArrayOf(isDendroServiceUser),
  });
};

// DendroServiceUser
export type DendroServiceUser = {
  userId: string;
  admin: boolean;
  createJobs: boolean;
  processJobs: boolean;
};

export const isDendroServiceUser = (x: any): x is DendroServiceUser => {
  return validateObject(x, {
    userId: isString,
    admin: isBoolean,
    createJobs: isBoolean,
    processJobs: isBoolean,
  });
};

// DendroServiceApp
export type DendroServiceApp = {
  serviceName: string;
  appName: string;
  appSpecificationUri: string;
  appSpecificationCommit: string;
  appSpecification: DendroAppSpecification;
};

export const isDendroServiceApp = (x: any): x is DendroServiceApp => {
  return validateObject(x, {
    serviceName: isString,
    appName: isString,
    appSpecificationUri: isString,
    appSpecificationCommit: isString,
    appSpecification: isDendroAppSpecification,
  });
};

// DendroComputeClient
export type DendroComputeClient = {
  serviceNames: string[];
  computeClientId: string;
  computeClientPrivateKey: string | null;
  computeClientName: string; // unique for service
  userId: string;
  processJobsForUsers?: string[] | null; // if provided and not null, only process jobs for these users
  description: string;
  computeSlots: ComputeClientComputeSlot[];
  timestampLastActiveSec?: number;
};

export const isDendroComputeClient = (x: any): x is DendroComputeClient => {
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
    lastAccessedSec: optional(isNumber), // to remove in future
  });
};

// DendroAppProcessorAttribute
export type DendroAppProcessorAttribute = {
  name: string;
  value: string | number | boolean | string[] | number[] | boolean[];
};

export const isDendroAppProcessorAttribute = (
  x: any,
): x is DendroAppProcessorAttribute => {
  return validateObject(x, {
    name: isString,
    value: isOneOf([
      isString,
      isNumber,
      isBoolean,
      isArrayOf(isString),
      isArrayOf(isNumber),
      isArrayOf(isBoolean),
    ]),
  });
};

// DendroAppProcessor
export type DendroAppProcessor = {
  name: string;
  description: string;
  label: string;
  image: string;
  executable: string;
  inputs: DendroAppProcessorInputFile[];
  outputs: DendroAppProcessorOutputFile[];
  parameters: DendroAppProcessorParameter[];
  attributes: DendroAppProcessorAttribute[];
};

export const isDendroAppProcessor = (x: any): x is DendroAppProcessor => {
  return validateObject(
    x,
    {
      name: isString,
      description: isString,
      label: isString,
      image: isString,
      executable: isString,
      inputs: isArrayOf(isDendroAppProcessorInputFile),
      outputs: isArrayOf(isDendroAppProcessorOutputFile),
      parameters: isArrayOf(isDendroAppProcessorParameter),
      attributes: isArrayOf(isDendroAppProcessorAttribute),
    },
    { callback: console.log },
  );
};

// DendroAppSpecification
export type DendroAppSpecification = {
  name: string;
  description: string;
  processors: DendroAppProcessor[];
};

export const isDendroAppSpecification = (
  x: any,
): x is DendroAppSpecification => {
  return validateObject(
    x,
    {
      name: isString,
      description: isString,
      processors: isArrayOf(isDendroAppProcessor),
    },
    { callback: console.log },
  );
};

// DendroJobInputFile
export type DendroJobInputFile = {
  name: string;
  fileBaseName: string;
  url: string;
};

export const isDendroJobInputFile = (x: any): x is DendroJobInputFile => {
  return validateObject(x, {
    name: isString,
    fileBaseName: isString,
    url: isString,
  });
};

// DendroJobOutputFile
export type DendroJobOutputFile = {
  name: string;
  fileBaseName: string;
  urlDeterminedAtRuntime?: boolean;
};

export const isDendroJobOutputFile = (x: any): x is DendroJobOutputFile => {
  return validateObject(x, {
    name: isString,
    fileBaseName: isString,
    urlDeterminedAtRuntime: optional(isBoolean),
  });
};

// DendroJobParameter
export type DendroJobParameter = {
  name: string;
  value: string | number | boolean | string[] | number[] | boolean[] | null; // null means undefined
};

export const isDendroJobParameter = (x: any): x is DendroJobParameter => {
  return validateObject(x, {
    name: isString,
    value: isOneOf([
      isString,
      isNumber,
      isBoolean,
      isArrayOf(isString),
      isArrayOf(isNumber),
      isArrayOf(isBoolean),
      isNull,
    ]),
  });
};

// DendroJobRequiredResources
export type DendroJobRequiredResources = {
  numCpus: number;
  numGpus: number;
  memoryGb: number;
  timeSec: number;
};

export const isDendroJobRequiredResources = (
  x: any,
): x is DendroJobRequiredResources => {
  return validateObject(x, {
    numCpus: isNumber,
    numGpus: isNumber,
    memoryGb: isNumber,
    timeSec: isNumber,
  });
};

// DendroJobSecret
export type DendroJobSecret = {
  name: string;
  value: string;
};

export const isDendroJobSecret = (x: any): x is DendroJobSecret => {
  return validateObject(x, {
    name: isString,
    value: isString,
  });
};

// DendroJobStatus
export type DendroJobStatus =
  | "pending"
  | "starting"
  | "running"
  | "completed"
  | "failed";

export const isDendroJobStatus = (x: any): x is DendroJobStatus => {
  return isOneOf(
    ["pending", "starting", "running", "completed", "failed"].map(isEqualTo),
  )(x);
};

// DendroJobDefinition
export type DendroJobDefinition = {
  appName: string;
  processorName: string;
  inputFiles: DendroJobInputFile[];
  outputFiles: DendroJobOutputFile[];
  parameters: DendroJobParameter[];
  cacheBust?: string;
};

export const isDendroJobDefinition = (x: any): x is DendroJobDefinition => {
  return validateObject(x, {
    appName: isString,
    processorName: isString,
    inputFiles: isArrayOf(isDendroJobInputFile),
    outputFiles: isArrayOf(isDendroJobOutputFile),
    parameters: isArrayOf(isDendroJobParameter),
    cacheBust: optional(isString),
  });
};

export type DendroJobOutputFileResult = {
  name: string;
  fileBaseName: string;
  url: string;
  size: number | null;
};

export const isDendroJobOutputFileResult = (
  x: any,
): x is DendroJobOutputFileResult => {
  return validateObject(x, {
    name: isString,
    fileBaseName: isString,
    url: isString,
    size: isOneOf([isNumber, isNull]),
  });
};

export type DendroJobOtherFileOutput = {
  name: string;
  url: string;
};

export const isDendroJobOtherFileOutput = (
  x: any,
): x is DendroJobOtherFileOutput => {
  return validateObject(x, {
    name: isString,
    url: isString,
  });
};

// DendroJob
export type DendroJob = {
  jobId: string;
  jobPrivateKey: string | null;
  serviceName: string;
  userId: string;
  batchId: string;
  tags: string[];
  jobDefinition: DendroJobDefinition;
  jobDefinitionHash: string;
  jobDependencies: string[];
  requiredResources: DendroJobRequiredResources;
  targetComputeClientIds?: string[] | null;
  secrets: DendroJobSecret[] | null;
  inputFileUrlList: string[];
  outputFileUrlList: string[];
  outputFileResults: DendroJobOutputFileResult[];
  otherFileOutputs?: DendroJobOtherFileOutput[];
  consoleOutputUrl: string;
  resourceUtilizationLogUrl: string;
  timestampCreatedSec: number;
  timestampStartingSec: number | null;
  timestampStartedSec: number | null;
  timestampFinishedSec: number | null;
  timestampUpdatedSec?: number | null;
  canceled: boolean;
  status: DendroJobStatus;
  isRunnable: boolean;
  error?: string | null;
  computeClientId: string | null;
  computeClientName: string | null;
  computeClientUserId: string | null;
  imageUri: string | null;
};

export const isDendroJob = (x: any): x is DendroJob => {
  return validateObject(x, {
    jobId: isString,
    jobPrivateKey: isOneOf([isString, isNull]),
    serviceName: isString,
    userId: isString,
    batchId: isString,
    tags: isArrayOf(isString),
    jobDefinition: isDendroJobDefinition,
    jobDefinitionHash: isString,
    jobDependencies: isArrayOf(isString),
    requiredResources: isDendroJobRequiredResources,
    targetComputeClientIds: optional(isOneOf([isArrayOf(isString), isNull])),
    secrets: isOneOf([isArrayOf(isDendroJobSecret), isNull]),
    inputFileUrlList: isArrayOf(isString),
    outputFileUrlList: isArrayOf(isString),
    outputFileResults: isArrayOf(isDendroJobOutputFileResult),
    otherFileOutputs: optional(isArrayOf(isDendroJobOtherFileOutput)),
    consoleOutputUrl: isString,
    resourceUtilizationLogUrl: isString,
    timestampCreatedSec: isNumber,
    timestampStartingSec: isOneOf([isNumber, isNull]),
    timestampStartedSec: isOneOf([isNumber, isNull]),
    timestampFinishedSec: isOneOf([isNumber, isNull]),
    timestampUpdatedSec: optional(isOneOf([isNumber, isNull])),
    canceled: isBoolean,
    status: isDendroJobStatus,
    isRunnable: isBoolean,
    error: optional(isOneOf([isString, isNull])),
    computeClientId: isOneOf([isString, isNull]),
    computeClientName: isOneOf([isString, isNull]),
    computeClientUserId: isOneOf([isString, isNull]),
    imageUri: isOneOf([isString, isNull]),
  });
};

// DendroAppProcessorInputFile
export type DendroAppProcessorInputFile = {
  name: string;
  description: string;
  list?: boolean;
};

export const isDendroAppProcessorInputFile = (
  x: any,
): x is DendroAppProcessorInputFile => {
  return validateObject(x, {
    name: isString,
    description: isString,
    list: optional(isBoolean),
  });
};

// DendroAppProcessorOutputFile
export type DendroAppProcessorOutputFile = {
  name: string;
  description: string;
  urlDeterminedAtRuntime?: boolean;
};

export const isDendroAppProcessorOutputFile = (
  x: any,
): x is DendroAppProcessorOutputFile => {
  return validateObject(x, {
    name: isString,
    description: isString,
    urlDeterminedAtRuntime: optional(isBoolean),
  });
};

// DendroAppProcessorParameterTypes
export type DendroAppProcessorParameterTypes =
  | "str"
  | "int"
  | "float"
  | "bool"
  | "List[str]"
  | "List[int]"
  | "List[float]"
  | "Optional[str]"
  | "Optional[int]"
  | "Optional[float]"
  | "Optional[bool]";

export const isDendroAppProcessorParameterTypes = (
  x: any,
): x is DendroAppProcessorParameterTypes => {
  return isOneOf(
    [
      "str",
      "int",
      "float",
      "bool",
      "List[str]",
      "List[int]",
      "List[float]",
      "Optional[str]",
      "Optional[int]",
      "Optional[float]",
      "Optional[bool]",
    ].map(isEqualTo),
  )(x);
};

// DendroAppProcessorParameter
export type DendroAppProcessorParameter = {
  name: string;
  type: DendroAppProcessorParameterTypes;
  description: string;
  defaultValue?: string | number | boolean | string[] | number[];
  options?: any[];
};

export const isDendroAppProcessorParameter = (
  x: any,
): x is DendroAppProcessorParameter => {
  return validateObject(
    x,
    {
      name: isString,
      type: isDendroAppProcessorParameterTypes,
      description: isString,
      defaultValue: optional(
        isOneOf([
          isString,
          isNumber,
          isBoolean,
          isArrayOf(isString),
          isArrayOf(isNumber),
        ]),
      ),
      options: optional(isArrayOf(() => true)),
    },
    { callback: console.log },
  );
};

// ComputeClientComputeSlot
export type ComputeClientComputeSlot = {
  numCpus: number;
  numGpus: number;
  memoryGb: number;
  timeSec: number;
  minNumCpus: number;
  minNumGpus: number;
  minMemoryGb: number;
  minTimeSec: number;
  multiplicity: number;
};

export const isComputeClientComputeSlot = (
  x: any,
): x is ComputeClientComputeSlot => {
  return validateObject(x, {
    numCpus: isNumber,
    numGpus: isNumber,
    memoryGb: isNumber,
    timeSec: isNumber,
    minNumCpus: isNumber,
    minNumGpus: isNumber,
    minMemoryGb: isNumber,
    minTimeSec: isNumber,
    multiplicity: isNumber,
  });
};

// DendroUser
export type DendroUser = {
  userId: string;
  name: string;
  email: string;
  apiKey: string | null;
};

export const isDendroUser = (x: any): x is DendroUser => {
  return validateObject(x, {
    userId: isString,
    name: isString,
    email: isString,
    apiKey: isOneOf([isString, isNull]),
  });
};

// addUser
export type AddUserRequest = {
  type: "addUserRequest";
  userId: string;
};

export const isAddUserRequest = (x: any): x is AddUserRequest => {
  return validateObject(x, {
    type: isEqualTo("addUserRequest"),
    user: isString,
  });
};

export type AddUserResponse = {
  type: "addUserResponse";
};

export const isAddUserResponse = (x: any): x is AddUserResponse => {
  return validateObject(x, {
    type: isEqualTo("addUserResponse"),
  });
};

// resetUserApiKey
export type ResetUserApiKeyRequest = {
  type: "resetUserApiKeyRequest";
  userId: string;
};

export const isResetUserApiKeyRequest = (
  x: any,
): x is ResetUserApiKeyRequest => {
  return validateObject(x, {
    type: isEqualTo("resetUserApiKeyRequest"),
    userId: isString,
  });
};

export type ResetUserApiKeyResponse = {
  type: "resetUserApiKeyResponse";
  apiKey: string;
};

export const isResetUserApiKeyResponse = (
  x: any,
): x is ResetUserApiKeyResponse => {
  return validateObject(x, {
    type: isEqualTo("resetUserApiKeyResponse"),
    apiKey: isString,
  });
};

// setUserInfo
export type SetUserInfoRequest = {
  type: "setUserInfoRequest";
  userId: string;
  name?: string;
  email?: string;
};

export const isSetUserInfoRequest = (x: any): x is SetUserInfoRequest => {
  return validateObject(x, {
    type: isEqualTo("setUserInfoRequest"),
    userId: isString,
    name: optional(isString),
    email: optional(isString),
  });
};

export type SetUserInfoResponse = {
  type: "setUserInfoResponse";
};

export const isSetUserInfoResponse = (x: any): x is SetUserInfoResponse => {
  return validateObject(x, {
    type: isEqualTo("setUserInfoResponse"),
  });
};

// addService
export type AddServiceRequest = {
  type: "addServiceRequest";
  serviceName: string;
  userId: string;
};

export const isAddServiceRequest = (x: any): x is AddServiceRequest => {
  return validateObject(x, {
    type: isEqualTo("addServiceRequest"),
    serviceName: isString,
    userId: isString,
  });
};

export type AddServiceResponse = {
  type: "addServiceResponse";
};

export const isAddServiceResponse = (x: any): x is AddServiceResponse => {
  return validateObject(x, {
    type: isEqualTo("addServiceResponse"),
  });
};

// getService
export type GetServiceRequest = {
  type: "getServiceRequest";
  serviceName: string;
};

export const isGetServiceRequest = (x: any): x is GetServiceRequest => {
  return validateObject(x, {
    type: isEqualTo("getServiceRequest"),
    serviceName: isString,
  });
};

export type GetServiceResponse = {
  type: "getServiceResponse";
  service: DendroService;
};

export const isGetServiceResponse = (x: any): x is GetServiceResponse => {
  return validateObject(x, {
    type: isEqualTo("getServiceResponse"),
    service: isDendroService,
  });
};

// getServices
export type GetServicesRequest = {
  type: "getServicesRequest";
  userId?: string;
};

export const isGetServicesRequest = (x: any): x is GetServicesRequest => {
  return validateObject(x, {
    type: isEqualTo("getServicesRequest"),
    userId: optional(isString),
  });
};

export type GetServicesResponse = {
  type: "getServicesResponse";
  services: DendroService[];
};

export const isGetServicesResponse = (x: any): x is GetServicesResponse => {
  return validateObject(x, {
    type: isEqualTo("getServicesResponse"),
    services: isArrayOf(isDendroService),
  });
};

// deleteService
export type DeleteServiceRequest = {
  type: "deleteServiceRequest";
  serviceName: string;
};

export const isDeleteServiceRequest = (x: any): x is DeleteServiceRequest => {
  return validateObject(x, {
    type: isEqualTo("deleteServiceRequest"),
    serviceName: isString,
  });
};

export type DeleteServiceResponse = {
  type: "deleteServiceResponse";
};

export const isDeleteServiceResponse = (x: any): x is DeleteServiceResponse => {
  return validateObject(x, {
    type: isEqualTo("deleteServiceResponse"),
  });
};

// setServiceInfo
export type SetServiceInfoRequest = {
  type: "setServiceInfoRequest";
  serviceName: string;
  users?: DendroServiceUser[];
};

export const isSetServiceInfoRequest = (x: any): x is SetServiceInfoRequest => {
  return validateObject(x, {
    type: isEqualTo("setServiceInfoRequest"),
    serviceName: isString,
    users: optional(isArrayOf(isDendroServiceUser)),
  });
};

export type SetServiceInfoResponse = {
  type: "setServiceInfoResponse";
};

export const isSetServiceInfoResponse = (
  x: any,
): x is SetServiceInfoResponse => {
  return validateObject(x, {
    type: isEqualTo("setServiceInfoResponse"),
  });
};

// createJob
export type CreateJobRequest = {
  type: "createJobRequest";
  serviceName: string;
  userId: string;
  batchId: string;
  tags: string[];
  jobDefinition: DendroJobDefinition;
  requiredResources: DendroJobRequiredResources;
  targetComputeClientIds?: string[];
  secrets: DendroJobSecret[];
  jobDependencies: string[];
  skipCache?: boolean;
  rerunFailing?: boolean;
  deleteFailing?: boolean;
};

export const isCreateJobRequest = (x: any): x is CreateJobRequest => {
  return validateObject(x, {
    type: isEqualTo("createJobRequest"),
    serviceName: isString,
    userId: isString,
    batchId: isString,
    tags: isArrayOf(isString),
    jobDefinition: isDendroJobDefinition,
    requiredResources: isDendroJobRequiredResources,
    targetComputeClientIds: optional(isArrayOf(isString)),
    secrets: isArrayOf(isDendroJobSecret),
    jobDependencies: isArrayOf(isString),
    skipCache: optional(isBoolean),
    rerunFailing: optional(isBoolean),
    deleteFailing: optional(isBoolean),
  });
};

export type CreateJobResponse = {
  type: "createJobResponse";
  job: DendroJob;
};

export const isCreateJobResponse = (x: any): x is CreateJobResponse => {
  return validateObject(x, {
    type: isEqualTo("createJobResponse"),
    job: isDendroJob,
  });
};

// findJobByDefinition
export type FindJobByDefinitionRequest = {
  type: "findJobByDefinitionRequest";
  serviceName: string;
  jobDefinition: DendroJobDefinition;
};

export const isFindJobByDefinitionRequest = (
  x: any,
): x is FindJobByDefinitionRequest => {
  return validateObject(x, {
    type: isEqualTo("findJobByDefinitionRequest"),
    serviceName: isString,
    jobDefinition: isDendroJobDefinition,
  });
};

export type FindJobByDefinitionResponse = {
  type: "findJobByDefinitionResponse";
  found: boolean;
  job?: DendroJob;
};

export const isFindJobByDefinitionResponse = (
  x: any,
): x is FindJobByDefinitionResponse => {
  return validateObject(x, {
    type: isEqualTo("findJobByDefinitionResponse"),
    found: isBoolean,
    job: optional(isDendroJob),
  });
};

// deleteJobs
export type DeleteJobsRequest = {
  type: "deleteJobsRequest";
  userId: string;
  jobIds: string[];
};

export const isDeleteJobsRequest = (x: any): x is DeleteJobsRequest => {
  return validateObject(x, {
    type: isEqualTo("deleteJobsRequest"),
    userId: isString,
    jobIds: isArrayOf(isString),
  });
};

export type DeleteJobsResponse = {
  type: "deleteJobsResponse";
};

export const isDeleteJobsResponse = (x: any): x is DeleteJobsResponse => {
  return validateObject(x, {
    type: isEqualTo("deleteJobsResponse"),
  });
};

// findJobs
export type FindJobsRequest = {
  type: "findJobsRequest";
  userId?: string;
  jobId?: string;
  processorName?: string;
  computeClientId?: string;
  batchId?: string;
  tags?: string[];
  serviceName?: string;
  appName?: string;
  inputFileUrl?: string;
  outputFileUrl?: string;
  status?: DendroJobStatus | DendroJobStatus[];
  limit?: number;
};

export const isFindJobsRequest = (x: any): x is FindJobsRequest => {
  return validateObject(x, {
    type: isEqualTo("findJobsRequest"),
    userId: optional(isString),
    jobId: optional(isString),
    processorName: optional(isString),
    computeClientId: optional(isString),
    batchId: optional(isString),
    tags: optional(isArrayOf(isString)),
    serviceName: optional(isString),
    appName: optional(isString),
    inputFileUrl: optional(isString),
    outputFileUrl: optional(isString),
    status: optional(
      isOneOf([isDendroJobStatus, isArrayOf(isDendroJobStatus)]),
    ),
    limit: optional(isNumber),
  });
};

export type FindJobsResponse = {
  type: "findJobsResponse";
  jobs: DendroJob[];
};

export const isFindJobsResponse = (x: any): x is FindJobsResponse => {
  return validateObject(x, {
    type: isEqualTo("findJobsResponse"),
    jobs: isArrayOf(isDendroJob),
  });
};

// getRunnableJobsForComputeClient
export type GetRunnableJobsForComputeClientRequest = {
  type: "getRunnableJobsForComputeClientRequest";
  computeClientId: string;
  jobId?: string;
  singleJob?: boolean;
};

export const isGetRunnableJobsForComputeClientRequest = (
  x: any,
): x is GetRunnableJobsForComputeClientRequest => {
  return validateObject(x, {
    type: isEqualTo("getRunnableJobsForComputeClientRequest"),
    computeClientId: isString,
    jobId: optional(isString),
    singleJob: optional(isBoolean),
  });
};

export type GetRunnableJobsForComputeClientResponse = {
  type: "getRunnableJobsForComputeClientResponse";
  runnableJobs: DendroJob[];
  runningJobs: DendroJob[];
};

export const isGetRunnableJobsForComputeClientResponse = (
  x: any,
): x is GetRunnableJobsForComputeClientResponse => {
  return validateObject(x, {
    type: isEqualTo("getRunnableJobsForComputeClientResponse"),
    runnableJobs: isArrayOf(isDendroJob),
    runningJobs: isArrayOf(isDendroJob),
  });
};

// getRunnableJob
export type GetRunnableJobRequest = {
  type: "getRunnableJobRequest";
  jobId: string;
};

export const isGetRunnableJobRequest = (x: any): x is GetRunnableJobRequest => {
  return validateObject(x, {
    type: isEqualTo("getRunnableJobRequest"),
    jobId: isString,
  });
};

export type GetRunnableJobResponse = {
  type: "getRunnableJobResponse";
  job: DendroJob;
};

export const isGetRunnableJobResponse = (
  x: any,
): x is GetRunnableJobResponse => {
  return validateObject(x, {
    type: isEqualTo("getRunnableJobResponse"),
    job: isDendroJob,
  });
};

// getJob
export type GetJobRequest = {
  type: "getJobRequest";
  jobId: string;
  includePrivateKey: boolean;
  computeClientId?: string;
};

export const isGetJobRequest = (x: any): x is GetJobRequest => {
  return validateObject(x, {
    type: isEqualTo("getJobRequest"),
    jobId: isString,
    includePrivateKey: isBoolean,
    computeClientId: optional(isString),
  });
};

export type GetJobResponse = {
  type: "getJobResponse";
  job?: DendroJob; // undefined means job not found
};

export const isGetJobResponse = (x: any): x is GetJobResponse => {
  return validateObject(x, {
    type: isEqualTo("getJobResponse"),
    job: optional(isDendroJob),
  });
};

// cancelJob
export type CancelJobRequest = {
  type: "cancelJobRequest";
  jobId: string;
};

export const isCancelJobRequest = (x: any): x is CancelJobRequest => {
  return validateObject(x, {
    type: isEqualTo("cancelJobRequest"),
    jobId: isString,
  });
};

export type CancelJobResponse = {
  type: "cancelJobResponse";
};

export const isCancelJobResponse = (x: any): x is CancelJobResponse => {
  return validateObject(x, {
    type: isEqualTo("cancelJobResponse"),
  });
};

// setJobStatus
export type SetJobStatusRequest = {
  type: "setJobStatusRequest";
  jobId: string;
  computeClientId: string;
  status: DendroJobStatus;
  error?: string;
};

export const isSetJobStatusRequest = (x: any): x is SetJobStatusRequest => {
  return validateObject(x, {
    type: isEqualTo("setJobStatusRequest"),
    jobId: isString,
    computeClientId: isString,
    status: isDendroJobStatus,
    error: optional(isString),
  });
};

export type SetJobStatusResponse = {
  type: "setJobStatusResponse";
};

export const isSetJobStatusResponse = (x: any): x is SetJobStatusResponse => {
  return validateObject(x, {
    type: isEqualTo("setJobStatusResponse"),
  });
};

// getSignedUploadUrl
export type GetSignedUploadUrlRequest = {
  type: "getSignedUploadUrlRequest";
  jobId: string;
  uploadType: "output" | "consoleOutput" | "resourceUtilizationLog" | "other";
  outputName?: string;
  otherName?: string;
  size: number;
};

export const isGetSignedUploadUrlRequest = (
  x: any,
): x is GetSignedUploadUrlRequest => {
  return validateObject(x, {
    type: isEqualTo("getSignedUploadUrlRequest"),
    jobId: isString,
    uploadType: isOneOf(
      ["output", "consoleOutput", "resourceUtilizationLog", "other"].map(
        isEqualTo,
      ),
    ),
    outputName: optional(isString),
    otherName: optional(isString),
    size: isNumber,
    fallbackFileBaseName: optional(isString), // historic -- to remove
  });
};

export type GetSignedUploadUrlResponse = {
  type: "getSignedUploadUrlResponse";
  signedUrl?: string;
  downloadUrl: string;
  parts?: {
    partNumber: number;
    signedUrl: string;
  }[];
  uploadId?: string;
};

export const isGetSignedUploadUrlResponse = (
  x: any,
): x is GetSignedUploadUrlResponse => {
  const isGetSignedUploadUrlResponsePart = (
    x: any,
  ): x is { partNumber: number; signedUrl: string } => {
    return validateObject(x, {
      partNumber: isNumber,
      signedUrl: isString,
    });
  };
  return validateObject(x, {
    type: isEqualTo("getSignedUploadUrlResponse"),
    signedUrl: optional(isString),
    downloadUrl: isString,
    parts: optional(isArrayOf(isGetSignedUploadUrlResponsePart)),
    uploadId: optional(isString),
  });
};

// getSignedDownloadUrl
export type GetSignedDownloadUrlRequest = {
  type: "getSignedDownloadUrlRequest";
  jobId: string;
  url: string;
};

export const isGetSignedDownloadUrlRequest = (
  x: any,
): x is GetSignedDownloadUrlRequest => {
  return validateObject(x, {
    type: isEqualTo("getSignedDownloadUrlRequest"),
    jobId: isString,
    url: isString,
  });
};

export type GetSignedDownloadUrlResponse = {
  type: "getSignedDownloadUrlResponse";
  signedUrl: string;
};

export const isGetSignedDownloadUrlResponse = (
  x: any,
): x is GetSignedDownloadUrlResponse => {
  return validateObject(x, {
    type: isEqualTo("getSignedDownloadUrlResponse"),
    signedUrl: isString,
  });
};

// finalizeMultipartUpload

export type FinalizeMultipartUploadRequest = {
  type: "finalizeMultipartUploadRequest";
  jobId: string;
  url: string;
  size: number;
  uploadId: string;
  parts: {
    PartNumber: number;
    ETag: string;
  }[];
};

export const isFinalizeMultipartUploadRequest = (
  x: any,
): x is FinalizeMultipartUploadRequest => {
  return validateObject(x, {
    type: isEqualTo("finalizeMultipartUploadRequest"),
    jobId: isString,
    url: isString,
    size: isNumber,
    uploadId: isString,
    parts: isArrayOf((y: any) =>
      validateObject(y, {
        PartNumber: isNumber,
        ETag: isString,
      }),
    ),
  });
};

export type FinalizeMultipartUploadResponse = {
  type: "finalizeMultipartUploadResponse";
};

export const isFinalizeMultipartUploadResponse = (
  x: any,
): x is FinalizeMultipartUploadResponse => {
  return validateObject(x, {
    type: isEqualTo("finalizeMultipartUploadResponse"),
  });
};

// cancelMultipartUpload

export type CancelMultipartUploadRequest = {
  type: "cancelMultipartUploadRequest";
  jobId: string;
  url: string;
  uploadId: string;
};

export const isCancelMultipartUploadRequest = (
  x: any,
): x is CancelMultipartUploadRequest => {
  return validateObject(x, {
    type: isEqualTo("cancelMultipartUploadRequest"),
    jobId: isString,
    url: isString,
    uploadId: isString,
  });
};

export type CancelMultipartUploadResponse = {
  type: "cancelMultipartUploadResponse";
};

export const isCancelMultipartUploadResponse = (
  x: any,
): x is CancelMultipartUploadResponse => {
  return validateObject(x, {
    type: isEqualTo("cancelMultipartUploadResponse"),
  });
};

// createComputeClient
export type CreateComputeClientRequest = {
  type: "createComputeClientRequest";
  serviceNames: string[];
  computeClientName: string;
  userId: string;
};

export const isCreateComputeClientRequest = (
  x: any,
): x is CreateComputeClientRequest => {
  return validateObject(x, {
    type: isEqualTo("createComputeClientRequest"),
    serviceNames: isArrayOf(isString),
    computeClientName: isString,
    userId: isString,
  });
};

export type CreateComputeClientResponse = {
  type: "createComputeClientResponse";
  computeClientId: string;
  computeClientPrivateKey: string;
};

export const isCreateComputeClientResponse = (
  x: any,
): x is CreateComputeClientResponse => {
  return validateObject(x, {
    type: isEqualTo("createComputeClientResponse"),
    computeClientId: isString,
    computeClientPrivateKey: isString,
  });
};

// deleteComputeClient
export type DeleteComputeClientRequest = {
  type: "deleteComputeClientRequest";
  computeClientId: string;
};

export const isDeleteComputeClientRequest = (
  x: any,
): x is DeleteComputeClientRequest => {
  return validateObject(x, {
    type: isEqualTo("deleteComputeClientRequest"),
    computeClientId: isString,
  });
};

export type DeleteComputeClientResponse = {
  type: "deleteComputeClientResponse";
};

export const isDeleteComputeClientResponse = (
  x: any,
): x is DeleteComputeClientResponse => {
  return validateObject(x, {
    type: isEqualTo("deleteComputeClientResponse"),
  });
};

// getComputeClient
export type GetComputeClientRequest = {
  type: "getComputeClientRequest";
  computeClientId: string;
};

export const isGetComputeClientRequest = (
  x: any,
): x is GetComputeClientRequest => {
  return validateObject(x, {
    type: isEqualTo("getComputeClientRequest"),
    computeClientId: isString,
  });
};

export type GetComputeClientResponse = {
  type: "getComputeClientResponse";
  computeClient: DendroComputeClient;
};

export const isGetComputeClientResponse = (
  x: any,
): x is GetComputeClientResponse => {
  return validateObject(x, {
    type: isEqualTo("getComputeClientResponse"),
    computeClient: isDendroComputeClient,
  });
};

// getComputeClients
export type GetComputeClientsRequest = {
  type: "getComputeClientsRequest";
  serviceName?: string;
};

export const isGetComputeClientsRequest = (
  x: any,
): x is GetComputeClientsRequest => {
  return validateObject(x, {
    type: isEqualTo("getComputeClientsRequest"),
    serviceName: optional(isString),
  });
};

export type GetComputeClientsResponse = {
  type: "getComputeClientsResponse";
  computeClients: DendroComputeClient[];
};

export const isGetComputeClientsResponse = (
  x: any,
): x is GetComputeClientsResponse => {
  return validateObject(x, {
    type: isEqualTo("getComputeClientsResponse"),
    computeClients: isArrayOf(isDendroComputeClient),
  });
};

// setComputeClientInfo
export type SetComputeClientInfoRequest = {
  type: "setComputeClientInfoRequest";
  computeClientId: string;
  serviceNames?: string[];
  computeClientName?: string;
  description?: string;
  computeSlots?: ComputeClientComputeSlot[];
  processJobsForUsers?: string[] | null;
};

export const isSetComputeClientInfoRequest = (
  x: any,
): x is SetComputeClientInfoRequest => {
  return validateObject(x, {
    type: isEqualTo("setComputeClientInfoRequest"),
    computeClientId: isString,
    serviceNames: optional(isArrayOf(isString)),
    computeClientName: optional(isString),
    description: optional(isString),
    computeSlots: optional(isArrayOf(isComputeClientComputeSlot)),
    processJobsForUsers: optional(isOneOf([isArrayOf(isString), isNull])),
  });
};

export type SetComputeClientInfoResponse = {
  type: "setComputeClientInfoResponse";
};

export const isSetComputeClientInfoResponse = (
  x: any,
): x is SetComputeClientInfoResponse => {
  return validateObject(x, {
    type: isEqualTo("setComputeClientInfoResponse"),
  });
};

// addServiceApp
export type AddServiceAppRequest = {
  type: "addServiceAppRequest";
  serviceApp: DendroServiceApp;
};

export const isAddServiceAppRequest = (x: any): x is AddServiceAppRequest => {
  return validateObject(x, {
    type: isEqualTo("addServiceAppRequest"),
    serviceApp: isDendroServiceApp,
  });
};

export type AddServiceAppResponse = {
  type: "addServiceAppResponse";
};

export const isAddServiceAppResponse = (x: any): x is AddServiceAppResponse => {
  return validateObject(x, {
    type: isEqualTo("addServiceAppResponse"),
  });
};

// setServiceAppInfo
export type SetServiceAppInfoRequest = {
  type: "setServiceAppInfoRequest";
  serviceName: string;
  appName: string;
  appSpecificationUri?: string;
  appSpecificationCommit?: string;
  appSpecification?: DendroAppSpecification;
};

export const isSetServiceAppInfoRequest = (
  x: any,
): x is SetServiceAppInfoRequest => {
  return validateObject(x, {
    type: isEqualTo("setServiceAppInfoRequest"),
    serviceName: isString,
    appName: isString,
    appSpecificationUri: optional(isString),
    appSpecificationCommit: optional(isString),
    appSpecification: optional(isDendroAppSpecification),
  });
};

export type SetServiceAppInfoResponse = {
  type: "setServiceAppInfoResponse";
};

export const isSetServiceAppInfoResponse = (
  x: any,
): x is SetServiceAppInfoResponse => {
  return validateObject(x, {
    type: isEqualTo("setServiceAppInfoResponse"),
  });
};

// getServiceApp
export type GetServiceAppRequest = {
  type: "getServiceAppRequest";
  serviceName: string;
  appName: string;
};

export const isGetServiceAppRequest = (x: any): x is GetServiceAppRequest => {
  return validateObject(x, {
    type: isEqualTo("getServiceAppRequest"),
    serviceName: isString,
    appName: isString,
  });
};

export type GetServiceAppResponse = {
  type: "getServiceAppResponse";
  serviceApp: DendroServiceApp;
};

export const isGetServiceAppResponse = (x: any): x is GetServiceAppResponse => {
  return validateObject(x, {
    type: isEqualTo("getServiceAppResponse"),
    serviceApp: isDendroServiceApp,
  });
};

// deleteApp
export type DeleteServiceAppRequest = {
  type: "deleteServiceAppRequest";
  serviceName: string;
  appName: string;
};

export const isDeleteServiceAppRequest = (
  x: any,
): x is DeleteServiceAppRequest => {
  return validateObject(x, {
    type: isEqualTo("deleteServiceAppRequest"),
    serviceName: isString,
    appName: isString,
  });
};

export type DeleteServiceAppResponse = {
  type: "deleteServiceAppResponse";
};

export const isDeleteServiceAppResponse = (
  x: any,
): x is DeleteServiceAppResponse => {
  return validateObject(x, {
    type: isEqualTo("deleteServiceAppResponse"),
  });
};

// getServiceApps
export type GetServiceAppsRequest = {
  type: "getServiceAppsRequest";
  appName?: string;
  serviceName?: string;
};

export const isGetServiceAppsRequest = (x: any): x is GetServiceAppsRequest => {
  return validateObject(x, {
    type: isEqualTo("getServiceAppsRequest"),
    appName: optional(isString),
    serviceName: optional(isString),
  });
};

export type GetServiceAppsResponse = {
  type: "getServiceAppsResponse";
  serviceApps: DendroServiceApp[];
};

export const isGetServiceAppsResponse = (
  x: any,
): x is GetServiceAppsResponse => {
  return validateObject(x, {
    type: isEqualTo("getServiceAppsResponse"),
    serviceApps: isArrayOf(isDendroServiceApp),
  });
};

// getPubsubSubscription
export type GetPubsubSubscriptionRequest = {
  type: "getPubsubSubscriptionRequest";
  computeClientId?: string;
  protocolVersion?: string;
};

export const isGetPubsubSubscriptionRequest = (
  x: any,
): x is GetPubsubSubscriptionRequest => {
  return validateObject(x, {
    type: isEqualTo("getPubsubSubscriptionRequest"),
    computeClientId: optional(isString),
    protocolVersion: optional(isString),
  });
};

export type GetPubsubSubscriptionResponse = {
  type: "getPubsubSubscriptionResponse";
  subscription: any;
};

export const isGetPubsubSubscriptionResponse = (
  x: any,
): x is GetPubsubSubscriptionResponse => {
  return validateObject(x, {
    type: isEqualTo("getPubsubSubscriptionResponse"),
    subscription: () => true,
  });
};

// pingComputeClients
export type PingComputeClientsRequest = {
  type: "pingComputeClientsRequest";
  serviceName: string;
};

export const isPingComputeClientsRequest = (
  x: any,
): x is PingComputeClientsRequest => {
  return validateObject(x, {
    type: isEqualTo("pingComputeClientsRequest"),
    serviceName: isString,
  });
};

export type PingComputeClientsResponse = {
  type: "pingComputeClientsResponse";
};

export const isPingComputeClientsResponse = (
  x: any,
): x is PingComputeClientsResponse => {
  return validateObject(x, {
    type: isEqualTo("pingComputeClientsResponse"),
  });
};

// computeUserStats
export type ComputeUserStatsRequest = {
  type: "computeUserStatsRequest";
  userId: string;
};

export const isComputeUserStatsRequest = (
  x: any,
): x is ComputeUserStatsRequest => {
  return validateObject(x, {
    type: isEqualTo("computeUserStatsRequest"),
    userId: isString,
  });
};

export type UserStats = {
  userId: string;
  consumed: {
    numJobs: number;
    cpuHours: number;
    gpuHours: number;
    gbHours: number;
    jobHours: number;
  };
  provided: {
    numJobs: number;
    cpuHours: number;
    gpuHours: number;
    gbHours: number;
    jobHours: number;
  };
  consumedDeleted: {
    numJobs: number;
    cpuHours: number;
    gpuHours: number;
    gbHours: number;
    jobHours: number;
  };
  providedDeleted: {
    numJobs: number;
    cpuHours: number;
    gpuHours: number;
    gbHours: number;
    jobHours: number;
  };
};

const isUserStats = (x: any): x is UserStats => {
  if (
    !validateObject(x, {
      userId: isString,
      consumed: () => true,
      provided: () => true,
      consumedDeleted: () => true,
      providedDeleted: () => true,
    })
  )
    return false;
  if (
    !validateObject(x.consumed, {
      numJobs: isNumber,
      cpuHours: isNumber,
      gpuHours: isNumber,
      gbHours: isNumber,
      jobHours: isNumber,
    })
  )
    return false;
  if (
    !validateObject(x.provided, {
      numJobs: isNumber,
      cpuHours: isNumber,
      gpuHours: isNumber,
      gbHours: isNumber,
      jobHours: isNumber,
    })
  )
    return false;
  if (
    !validateObject(x.consumedDeleted, {
      numJobs: isNumber,
      cpuHours: isNumber,
      gpuHours: isNumber,
      gbHours: isNumber,
      jobHours: isNumber,
    })
  )
    return false;
  if (
    !validateObject(x.providedDeleted, {
      numJobs: isNumber,
      cpuHours: isNumber,
      gpuHours: isNumber,
      gbHours: isNumber,
      jobHours: isNumber,
    })
  )
    return false;
  return true;
};

export type ComputeUserStatsResponse = {
  type: "computeUserStatsResponse";
  userStats: UserStats;
};

export const isComputeUserStatsResponse = (
  x: any,
): x is ComputeUserStatsResponse => {
  return validateObject(x, {
    type: isEqualTo("computeUserStatsResponse"),
    userStats: isUserStats,
  });
};

// getDandiApiKey
// For now, we can get the DANDI API key, but only in restricted
// circumstances. In the future the API key will remain secret on the
// server.
export type GetDandiApiKeyRequest = {
  type: "getDandiApiKeyRequest";
  jobId: string;
  outputName: string;
};

export const isGetDandiApiKeyRequest = (x: any): x is GetDandiApiKeyRequest => {
  return validateObject(x, {
    type: isEqualTo("getDandiApiKeyRequest"),
    jobId: isString,
    outputName: isString,
  });
};

export type GetDandiApiKeyResponse = {
  type: "getDandiApiKeyResponse";
  dandiApiKey: string;
};

export const isGetDandiApiKeyResponse = (
  x: any,
): x is GetDandiApiKeyResponse => {
  return validateObject(x, {
    type: isEqualTo("getDandiApiKeyResponse"),
    dandiApiKey: isString,
  });
};

// setOutputFileUrl
export type setOutputFileUrlRequest = {
  type: "setOutputFileUrlRequest";
  jobId: string;
  outputName: string;
  url: string;
};

export const issetOutputFileUrlRequest = (
  x: any,
): x is setOutputFileUrlRequest => {
  return validateObject(x, {
    type: isEqualTo("setOutputFileUrlRequest"),
    jobId: isString,
    outputName: isString,
    url: isString,
  });
};

export type setOutputFileUrlResponse = {
  type: "setOutputFileUrlResponse";
};

export const issetOutputFileUrlResponse = (
  x: any,
): x is setOutputFileUrlResponse => {
  return validateObject(x, {
    type: isEqualTo("setOutputFileUrlResponse"),
  });
};
