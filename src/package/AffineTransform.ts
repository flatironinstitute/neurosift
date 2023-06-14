export type AffineTransform = {
    forward: number[][],
    inverse: number[][]
}
export const identityAffineTransform: AffineTransform = {
    forward: [[1, 0, 0], [0, 1, 0]],
    inverse: [[1, 0, 0], [0, 1, 0]]
}
export const applyAffineTransform = (M: AffineTransform, p: {x: number, y: number}): {x: number, y: number} => {
    return {
        x: p.x * M.forward[0][0] + p.y * M.forward[0][1] + M.forward[0][2],
        y: p.x * M.forward[1][0] + p.y * M.forward[1][1] + M.forward[1][2]
    }
}
export const applyAffineTransformInv = (M: AffineTransform, p: {x: number, y: number}): {x: number, y: number} => {
    return {
        x: p.x * M.inverse[0][0] + p.y * M.inverse[0][1] + M.inverse[0][2],
        y: p.x * M.inverse[1][0] + p.y * M.inverse[1][1] + M.inverse[1][2]
    }
}
export const multAffineTransforms = (A: AffineTransform, B: AffineTransform): AffineTransform => {
    return {
        forward: _mult(A.forward, B.forward),
        inverse: _mult(B.inverse, A.inverse)
    }
}
export const createAffineTransform = (x: number[][]): AffineTransform => {
    return {
        forward: [...x.map(r => ([...r]))],
        inverse: _inv(x)
    }
}
export const inverseAffineTransform = (A: AffineTransform): AffineTransform => {
    return {
        forward: A.inverse,
        inverse: A.forward
    }
}

export const detAffineTransform = (A: AffineTransform): number => {
    return A.forward[0][0] * A.forward[1][1] - A.forward[0][1] * A.forward[1][0]
}

const _mult = (A: number[][], B: number[][]): number[][] => {
    return [
        [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1], A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2]],
        [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1], A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2]]
    ]
}

const _inv = (A: number[][]) => {   
    const M = [[A[0][0], A[0][1]], [A[1][0], A[1][1]]]
    const T = [A[0][2], A[1][2]]
    const det = M[0][0] * M[1][1] - M[0][1] * M[1][0]
    const Minv = [
        [M[1][1] / det, -M[0][1] / det],
        [-M[1][0] / det, M[0][0] / det],
    ]
    const Minv_T = [Minv[0][0] * T[0] + Minv[0][1] * T[1], Minv[1][0] * T[0] + Minv[1][1] * T[1]]
    return [
        [Minv[0][0], Minv[0][1], -Minv_T[0]],
        [Minv[1][0], Minv[1][1], -Minv_T[1]]
    ]
}