import React, { FunctionComponent, PropsWithChildren } from "react";

type Props = {
	onClick?: () => void
	color?: string
	disabled?: boolean
	href?: string
    target?: string
	title?: string
}

const Hyperlink: FunctionComponent<PropsWithChildren<Props>> = ({children, onClick, color, disabled, href, target, title}) => {
	if (href) {
		return <a href={href} target={target} style={{cursor: 'pointer', color: color || 'darkblue'}} title={title}>{children}</a>
	}
	return (
		!disabled ? (
			<a onClick={onClick} style={{cursor: 'pointer', color: color || 'darkblue'}} title={title}>{children}</a>
		) : (
			<span style={{color: 'gray'}} title={title}>{children}</span>
		)
	)
}

export default Hyperlink
