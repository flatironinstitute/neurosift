import { TransformationMatrix, Vec2 } from './Geometry';

const funcToTransform = (transformation: (p: Vec2) => Vec2): TransformationMatrix => {
    const p00 = transformation([0, 0])
    const p10 = transformation([1, 0])
    const p01 = transformation([0, 1])

    const M: TransformationMatrix = [
        [p10[0] - p00[0], p01[0] - p00[0], p00[0]],
        [p10[1] - p00[1], p01[1] - p00[1], p00[1]],
        [0, 0, 1]
    ]
    return M
}

export default funcToTransform;