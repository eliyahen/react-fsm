import React from "react"
import { useFSMachine } from "../module"
import { MultiFactorAuthLoginSteps, SendMethod } from "./MultiFactorAuthLoginProvider"
import './styles.scss'

function MultiFactorAuthLoginWizard() {
    const { state, isBlocked, getPayload, invokeStateTrigger } = useFSMachine<MultiFactorAuthLoginSteps>()

    return (
        <div className="vertical-flex">
            <h4>Multi-Factor Auth Login</h4>

            {state === 'welcome' && (
                <WelcomeScreen onStart={invokeStateTrigger(state)('start')} />)}
            {state === 'userCredentials' && (
                <UserCredentialsScreen
                    initialSendMethod={getPayload<typeof state>().sendMethod}
                    onValidate={invokeStateTrigger(state)('validate')}
                />)}
            {state === 'verificationCode' && 
                (<VerificationCodeScreen
                    sendMethod={getPayload<typeof state>().sendMethod}
                    onValidate={invokeStateTrigger(state)('validate')}
                    onChangeMethod={invokeStateTrigger(state)('changeSendMethod')}
                />)}
            {state === 'changeSendMethod' && (
                <ChangeSendMethodScreen
                    initialSendMethod={getPayload<typeof state>().sendMethod}
                    onChangeMethod={invokeStateTrigger(state)('resendVerificationCode')}
                    onCancel={invokeStateTrigger(state)('cancel')}
                />)}
            {state === 'loginFaulure' && (
                <LoginFaulureScreen onRetry={invokeStateTrigger(state)('retry')} />)}
            {state === 'loginSuccess' && (
                <LoginSuccessScreen />)}

            {isBlocked && (
                <div className="overlay">
                    <h3>Processing...</h3>
                </div>
            )}
        </div>
    )
}

function WelcomeScreen({onStart}: {onStart: () => void}) {
    return (
        <>
            <h4>Welcome stranger!</h4>
            <button onClick={onStart}>Start</button>
        </>
    )
}

function UserCredentialsScreen({initialSendMethod = 'sms', onValidate}: {initialSendMethod?: SendMethod, onValidate: (email: string, password: string, sendMethod: SendMethod) => void}) {
    const [email, setEmail] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [sendMethod, setSendMethod] = React.useState<SendMethod>(initialSendMethod)

    const handleSubmit = React.useCallback((evt: React.FormEvent) => {
        evt.preventDefault()
        onValidate(email, password, sendMethod)
    }, [onValidate, email, password, sendMethod])
    
    return (
        <>
            <form onSubmit={handleSubmit} className="vertical-flex">
                <label>Email: <input name="email" type="text" value={email} onChange={(evt) => setEmail(evt.target.value)} /></label>
                <label>Password: <input name="password" type="password" value={password} onChange={(evt) => setPassword(evt.target.value)} /></label>
                <select name="sendMethod" value={sendMethod} onChange={(evt) => setSendMethod(evt.target.value as SendMethod)}>
                    <option value="sms">SMS</option>
                    <option value="email">Email</option>
                    <option value="application">Application</option>
                </select>
                <button type="submit">Submit</button>
            </form>
        </>
    )
}

function VerificationCodeScreen({sendMethod, onValidate, onChangeMethod}: {sendMethod: SendMethod, onValidate: (code: string) => void, onChangeMethod: () => void}) {
    const [code, setCode] = React.useState('')

    const handleSubmit = React.useCallback((evt: React.FormEvent) => {
        evt.preventDefault()
        onValidate(code)
    }, [onValidate, code])

    const handleChangeMethod = React.useCallback(() => {
        onChangeMethod()
    }, [])
    
    return (
        <>
            <form onSubmit={handleSubmit} className="vertical-flex">
                <label>Verification Code: <input name="verificationCode" type="text" value={code} onChange={(evt) => setCode(evt.target.value)} /></label>
                <button type="submit">Submit</button>
                <div>Verification code was sent to you by {sendMethod}. <button className="asLink" onClick={handleChangeMethod}>Change</button></div>
            </form>
        </>
    )
}

function ChangeSendMethodScreen({initialSendMethod, onChangeMethod, onCancel}: {initialSendMethod: SendMethod, onChangeMethod: (selectedSendMethod: SendMethod) => void, onCancel: () => void}) {
    const [sendMethod, setSendMethod] = React.useState<SendMethod>(initialSendMethod)

    return (
        <>
            <select name="sendMethod" value={sendMethod} onChange={(evt) => setSendMethod(evt.target.value as SendMethod)}>
                <option value="sms">SMS</option>
                <option value="email">Email</option>
                <option value="application">Application</option>
            </select>
            <button onClick={() => onChangeMethod(sendMethod)}>Change</button>
            <button onClick={onCancel}>Cancel</button>
        </>
    )
}

function LoginSuccessScreen() {
    return <div>You are logged in!</div>
}

function LoginFaulureScreen({onRetry}: {onRetry: () => void}) {
    return (
        <>
            <div>Sorry, we could not log you in.</div>
            <button onClick={onRetry}>Retry</button>
        </>
    )
}

export default MultiFactorAuthLoginWizard
