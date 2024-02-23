import { FunctionComponent, PropsWithChildren } from "react";
import "./SmallIconButton.css"

type Props = {
    onClick?: () => void
    title?: string
    disabled?: boolean
    icon?: any
    fontSize?: number
    label?: string
}

const SmallIconButton: FunctionComponent<PropsWithChildren<Props>> = ({icon, onClick, title, label, disabled, fontSize}) => {
    const classNames = ['SmallIconButton']
    if (disabled) classNames.push('disabled')
    else classNames.push('enabled')
    return (
        <span className={classNames.join(" ")} title={title} onClick={!disabled ? onClick : undefined} style={{cursor: 'pointer', fontSize: (fontSize || 18) * 0.8}}>
            {icon && <icon.type className={classNames.join(" ")} {...icon.props} style={{fontSize: fontSize || 18, verticalAlign: 'bottom'}} />}
            {label && <span style={{marginLeft: 4, verticalAlign: 'bottom'}}>{label}</span>}
        </span>
    )
}

export default SmallIconButton