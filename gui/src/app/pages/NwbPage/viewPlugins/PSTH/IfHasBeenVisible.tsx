import { FunctionComponent, PropsWithChildren, useRef } from "react";
import { InView } from "react-intersection-observer";

type Props ={
	width: number
	height: number
}

const IfHasBeenVisible: FunctionComponent<PropsWithChildren<Props>> = ({children, width, height}) => {
	const hasBeenVisible = useRef(false)
	return (
		<div style={{position: 'relative', width, height}}>
			<InView>
				{({inView, ref}: {inView: boolean, ref: any}) => {
					if (inView) hasBeenVisible.current = true;
					return (
						<div ref={ref}>
							{
								inView || hasBeenVisible.current ? children : <span>Not visible</span>
							}
						</div>
					)
				}}
			</InView>
		</div>
	)
}

export default IfHasBeenVisible
