# react-fsm

Finite State Machine (FSM) for React.
FSM is a computational model that consists of a finite number of states. It transitions between these states based on inputs or event triggers. Each transition moves the FSM from one state to another, based on the current state and the input received. FSMs are used to model systems with distinct conditions or statuses and can help manage complex workflows and behaviors systematically.

### Demo

[See demo here](https://eliyahen.github.io/react-fsm/)

### Installation

```zsh
yarn add react-fsm@https://github.com/eliyahen/react-fsm.git
```

You may deploy it as module federation in a remote and consume it in your host.

### Usage

Import `FSMachine` provider to define your state machine as a React Provider.

```ts
import FSMachine, { FSMStatesTriggersDef } from 'react-fsm';

// define the machine states, triggers and payloads.
type MyLoginMachine = {
    // state "credentials"
    credentials: {
        triggers: {
            // trigger "verify" with expected inputs
            verify: (email: string, password: string) => void
        }
    }
    verifySuccess: {
        payload: { userId: string, userName: string }
        // no triggers - final state
    }
    verifyFail: {
        triggers: {
            retry: () => void
        }
    }
}

function MyLoginProvider({children}: {children?: React.ReactNode}) {
    // define the machine state triggers
    const statesTriggers = React.useMemo<FSMStatesTriggersDef<MyLoginMachine>>(() => ({
        credentials: {
            verify: (api) => (email, password) => {
                // do stuff - verify credentials
                const success = true
                
                if (success) {
                    // transition to state "verifySuccess" with the given payload
                    api.transition('verifySuccess', { userId: 1, userName: 'ADMIN' })
                } else {
                    // transition to state with no payload
                    api.transition('verifyFail', undefined)
                }
            },
            verifySuccess: {},
            verifyFail: {
                retry: (api) => () => api.transition('credentials', undefined)
            }
        }
    }), [])

    return (
        <FSMachine<MyLoginMachine>
            statesTriggers={statesTriggers}
            initialState="credentials"
            initialStatePayload={undefined}
        >
            {children}
        </FSMMachine>
    )
}
```

The `api` given for creating the state triggers is as follows:

```ts
interface FSMTransitionApi {
    // current state
    state: string

    // current state paylaod
    payload: object | undefined

    // triggers that return Promise will block the machine from transition until promise is resolved
    isBlocked: boolean

    // get all available states of the machine
    getAllStates: () => string[]

    // transition to target state injecting payload
    transition: (
        state: string,
        payload: object | undefined
    ) => void
}
```

After building the machine provider, it is now the time to get access to it and design your application. The states and logics are already configured, just trigger the current state to move on.

```tsx
function MyLogin() {
    // get some data and api from the provider - use your MyLoginMachine type to get TS magic.
    const { state, isBlocked, getPayload, invokeStateTrigger } = useFSMachine<MyLoginMachine>()

    // I find it useful to pass events to the components which trigger the machine.
    return (
        <div>
            {state === 'credentials' && (
                <CredentialsScreen
                    onVerify={invokeStateTrigger(state)('verify')}
                />)}
            {state === 'verifySuccess' && (
                <VerifySuccessScreen
                    {...getPayload<'verifySuccess'>()}
                />)}
            {state === 'verifyFail' && (
                <VerifyFailScreen
                    onRetry={invokeStateTrigger(state)('retry')}
                />)}

            {isBlocked && (
                <div>Machine is halt. Please wait...</div>
            )}
        </div>
    )
}
```

See detailed documentation in file `FSMachine.types.ts`.
