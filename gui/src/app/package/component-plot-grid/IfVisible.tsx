import { FunctionComponent, PropsWithChildren } from "react";
import { InView } from "react-intersection-observer";

type Props ={
	width: number
	height: number
}

const IfVisible: FunctionComponent<PropsWithChildren<Props>> = ({children, width, height}) => {
	return (
		<div style={{position: 'relative', width, height}}>
			<InView>
				{({inView, ref}: {inView: boolean, ref: any}) => {
					return (
						<div ref={ref}>
							{
								inView ? children : <span>Not visible</span>
							}
						</div>
					)
				}}
			</InView>
		</div>
	)
}

export default IfVisible
