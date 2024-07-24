/* eslint-disable @typescript-eslint/no-explicit-any */
import { isArrayOf, isBoolean, isNumber, isString, optional, validateObject } from "@fi-sci/misc";

export type NeurosiftAnnotation = {
  annotationId: string
  userId: string
  annotationType: string
  annotation: any
  timestampCreated: number
  dandiInstanceName?: string
  dandisetId?: string
  dandisetVersion?: string
  assetPath?: string
  assetId?: string
  assetUrl?: string
}

export const isNeurosiftAnnotation = (x: any): x is NeurosiftAnnotation => {
  return validateObject(x, {
    annotationId: isString,
    userId: isString,
    annotationType: isString,
    annotation: () => (true),
    timestampCreated: isNumber,
    dandiInstanceName: optional(isString),
    dandisetId: optional(isString),
    dandisetVersion: optional(isString),
    assetPath: optional(isString),
    assetId: optional(isString),
    assetUrl: optional(isString)
  })
}

export type GetAnnotationsRequest = {
  annotationId?: string
  userId?: string
  annotationType?: string
  dandiInstanceName?: string
  dandisetId?: string
  dandisetVersion?: string
  assetPath?: string
  assetId?: string
  assetUrl?: string
}

export const isGetAnnotationsRequest = (x: any): x is GetAnnotationsRequest => {
  return validateObject(x, {
    annotationId: optional(isString),
    userId: optional(isString),
    annotationType: optional(isString),
    dandiInstanceName: optional(isString),
    dandisetId: optional(isString),
    dandisetVersion: optional(isString),
    assetPath: optional(isString),
    assetId: optional(isString),
    assetUrl: optional(isString),
  })
}

export type GetAnnotationsResponse = {
  annotations: NeurosiftAnnotation[]
}

export const isGetAnnotationsResponse = (x: any): x is GetAnnotationsResponse => {
  return validateObject(x, {
    annotations: isArrayOf(isNeurosiftAnnotation)
  })
}

export type AddAnnotationRequest = {
  userId: string
  annotationType: string
  annotation: any
  dandiInstanceName?: string
  dandisetId?: string
  dandisetVersion?: string
  assetPath?: string
  assetId?: string
  assetUrl?: string
}

export const isAddAnnotationRequest = (x: any): x is AddAnnotationRequest => {
  return validateObject(x, {
    userId: isString,
    annotationType: isString,
    annotation: () => (true),
    dandiInstanceName: optional(isString),
    dandisetId: optional(isString),
    dandisetVersion: optional(isString),
    assetPath: optional(isString),
    assetId: optional(isString),
    assetUrl: optional(isString),
  })
}

export type AddAnnotationResponse = {
  annotationId: string
}

export const isAddAnnotationResponse = (x: any): x is AddAnnotationResponse => {
  return validateObject(x, {
    annotationId: isString
  })
}

export type DeleteAnnotationRequest = {
  annotationId: string
}

export const isDeleteAnnotationRequest = (x: any): x is DeleteAnnotationRequest => {
  return validateObject(x, {
    annotationId: isString
  })
}

export type DeleteAnnotationResponse = {
  success: boolean
}

export const isDeleteAnnotationResponse = (x: any): x is DeleteAnnotationResponse => {
  return validateObject(x, {
    success: isBoolean
  })
}