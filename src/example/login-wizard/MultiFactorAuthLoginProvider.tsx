import React from "react";
import FSMachine, { FSMStatesTriggersDef } from "../../module";

export type SendMethod = 'application' | 'sms' | 'email' 

// define the FSMachine steps states
export type MultiFactorAuthLoginSteps = {
    welcome: {
        triggers: {
            start: () => void
        }
    }
    userCredentials: {
        payload: { sendMethod?: SendMethod }
        triggers: {
            validate: (email: string, password: string, sendMethod: SendMethod) => void
        }
    }
    verificationCode: {
        payload: { sendMethod: SendMethod }
        triggers: {
            validate: (code: string) => void
            changeSendMethod: () => void
        }
    }
    changeSendMethod: {
        payload: { sendMethod: SendMethod }
        triggers: {
            resendVerificationCode: (sendMethod: SendMethod) => void
            cancel: () => void
        }
    }
    loginSuccess: {}
    loginFaulure: {
        triggers: {
            retry: () => void
        }
    }
}

function MultiFactorAuthLoginProvider({preferrableSendMethod = 'application', children}: {preferrableSendMethod?: SendMethod; children?: React.ReactNode}) {
    // generate the FSMachine steps states triggers
    // DUMMY - In real world requests would be sent to server to operate the login.
    const stepsTriggers = React.useMemo<FSMStatesTriggersDef<MultiFactorAuthLoginSteps>>(() => {
        return {
            welcome: {
                // ACTION - start
                start: (api) => () => {
                    api.transition('userCredentials', { sendMethod: preferrableSendMethod })
                },
            },

            userCredentials: {
                // ACTION - validate credentials and send verification if valid
                validate: (api) => (email: string, password: string, sendMethod: SendMethod) => new Promise((resolve) => {
                    // DUMMY - just check email and password entered (any string)
                    setTimeout(() => {
                        if (email && password) {
                            console.log(`Credentials are valid! Sending verification code through ${sendMethod}.`)
                            api.transition('verificationCode', { sendMethod })
                        } else {
                            console.log('Credentials are invalid! email or password are empty.')
                            api.transition('loginFaulure', undefined)
                        }
                        resolve(undefined)
                    }, 2000)
                }),
            },

            verificationCode: {
                // ACTION - validate verification code
                validate: (api) => (code: string) => new Promise((resolve) => {
                    // DUMMY - check code is 1234
                    setTimeout(() => {
                        if (code === '1234') {
                            console.log('Verfication code valid!')
                            api.transition('loginSuccess', undefined)
                        } else {
                            console.log('Verification code invalid!')
                            api.transition('loginFaulure', undefined)
                        }
                        resolve(undefined)
                    }, 2000)
                }),
                
                // ACTION - change send method for verification code
                changeSendMethod: (api) => () => {
                    console.log('Change send method for verification code.')
                    api.transition('changeSendMethod', { sendMethod: api.payload.sendMethod })
                }
            },

            changeSendMethod: {
                // ACTION - resend verification code and go to verification code
                resendVerificationCode: (api) => (sendMethod: SendMethod) => {
                    console.log(`Ressnding verification code through ${sendMethod}.`)
                    api.transition('verificationCode', { sendMethod })
                },

                // ACTION - cancel change of send method and return to verification code
                cancel: (api) => () => {
                    console.log('Cancel change for send method.')
                    api.transition('verificationCode', { sendMethod: api.payload.sendMethod })
                },
            },

            loginSuccess: {
                // final state - no actions
            },

            loginFaulure: {
                // ACTION - retry to login with new credentials
                retry: (api) => () => {
                    console.log('Retry to login.')
                    api.transition('userCredentials', { sendMethod: preferrableSendMethod })
                },
            },
        }
    }, [preferrableSendMethod])

    return (
        <FSMachine<MultiFactorAuthLoginSteps> statesTriggers={stepsTriggers} initialState="welcome" initialStatePayload={undefined}>
            {children}
        </FSMachine>
    )
}

export default MultiFactorAuthLoginProvider
