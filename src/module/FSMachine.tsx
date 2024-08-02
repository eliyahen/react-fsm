import React, { useContext, useImperativeHandle } from "react"
import { EventEmitter } from 'events'
import { FSMachineApi, FSMachineProps, FSMStatePayload, FSMStates, FSMStatesDef, FSMStateTriggerArgs, FSMStateTriggers } from "./FSMachine.types"

const EVENT_TRANSITION_DONE = 'transitionDone'
const EVENT_TRIGGER_INVOKE = 'triggerInvoke'

const initialMachineApi: FSMachineApi<any, any> = {
    state: 'dummy',
    getPayload: () => {},
    isBlocked: false,
    getAllStates: () => [],
    getAllTriggers: () => [],
    getStateTriggers: () => [],
    invokeStateTrigger: () => () => async () => {},
    addTransitionDoneListener: () => () => {},
    addTriggerInvokeListener: () => () => {},
}

const fsMachineContext = React.createContext<FSMachineApi<any, any>>(initialMachineApi)

function FSMachine<
    StatesDef extends FSMStatesDef,
    InitialState extends FSMStates<StatesDef> = FSMStates<StatesDef>
>(
    {children, initialState, initialStatePayload, statesTriggers, apiRef, onTransitionDone, onTriggerInvoke}: {
        children?: React.ReactNode
    } & FSMachineProps<StatesDef, InitialState>
) {
    // prevent changes for the machine declaration, so memoize it once in the beginning and use the initial declaration always.
    const statesDef = React.useRef(statesTriggers)
    const machineDeclaration = statesDef.current

    const [curState, setCurState] = React.useState<FSMStates<StatesDef>>(initialState)
    const [curPayload, setCurPayload] = React.useState<FSMStatePayload<StatesDef, FSMStates<StatesDef>>>(initialStatePayload)
    const [isBlocked, setIsBlocked] = React.useState(false)
    
    // create data ref to hold data for functions (avoid changing reference of api methods)
    const dataRef = React.useRef<{
        curState: FSMStates<StatesDef>
        curPayload: FSMStatePayload<StatesDef, typeof curState>
        isBlocked: boolean
    }>({curState, curPayload, isBlocked})
    dataRef.current.curState = curState
    dataRef.current.curPayload = curPayload
    dataRef.current.isBlocked = isBlocked

    // initialize event emitter
    const eventEmitterRef = React.useRef<EventEmitter>(new EventEmitter())

    const getPayload = React.useCallback(
        <State extends FSMStates<StatesDef>>(): FSMStatePayload<StatesDef, State> => dataRef.current.curPayload,
        []
    )

    const getAllStates = React.useCallback(
        () => Object.keys(machineDeclaration) as FSMStates<StatesDef>,
        [machineDeclaration]
    )

    const getAllTriggers = React.useCallback(
        () =>
            Array.from(new Set(
                Object.keys(machineDeclaration)
                    .flatMap((state) => Object.keys(machineDeclaration[state as FSMStates<StatesDef>]) as FSMStateTriggers<StatesDef, FSMStates<StatesDef>>)
            )),
        [machineDeclaration]
    )

    const getStateTriggers = React.useCallback(
        <State extends FSMStates<StatesDef>>(state: State) =>
            Object.keys(machineDeclaration[state]) as FSMStateTriggers<StatesDef, State>[],
        [machineDeclaration]
    )

    const commitTransition = React.useCallback(
        (state: FSMStates<StatesDef>, payload: FSMStatePayload<StatesDef, typeof state>) => {
            setCurState(state)
            setCurPayload(payload)

            // handle prop onTransitionDone and emit transitionDone event
            onTransitionDone?.(curState, state, curPayload, payload)
            eventEmitterRef.current.emit(EVENT_TRANSITION_DONE, dataRef.current.curState, state, dataRef.current.curPayload, payload)
        },
        [onTransitionDone]
    )

    const invokeStateTrigger = React.useCallback(
        <State extends FSMStates<StatesDef>>(state: State) =>
            <Trigger extends FSMStateTriggers<StatesDef, State> = FSMStateTriggers<StatesDef, State>>(trigger: Trigger) =>
                async (...args: FSMStateTriggerArgs<StatesDef, State, Trigger>) => {
                    // only invoke trigger when the given state is matching the current state
                    if (state === dataRef.current.curState && !dataRef.current.isBlocked) {
                        // get the trigger function of the current state
                        const stateTriggerFn = machineDeclaration[dataRef.current.curState][trigger]

                        // mark machine is blocked for triggers
                        setIsBlocked(true)

                        //handle prop onTriggerInvoke and emit triggerInvoke event
                        onTriggerInvoke?.(dataRef.current.curState, dataRef.current.curPayload, trigger, ...args)
                        eventEmitterRef.current.emit(EVENT_TRIGGER_INVOKE, dataRef.current.curState, dataRef.current.curPayload, trigger, ...args)

                        // call the trigger function, pass it the machine API to enable transition to new state, and call it again with the trigger arguments.
                        // Note: Though we expect to have a synchronous trigger function, we use "await" to block the 
                        await stateTriggerFn({
                            state: dataRef.current.curState,
                            payload: dataRef.current.curPayload,
                            isBlocked: dataRef.current.isBlocked,
                            transition: commitTransition,
                            getAllStates,
                        })(...args)

                        // revert machine to not blocked, so it can accept new triggers
                        setIsBlocked(false)
                    }
                },
        [machineDeclaration, onTriggerInvoke, commitTransition, getAllStates, getAllTriggers, getStateTriggers]
    )

    const addTransitionDoneListener = React.useCallback(
        (
            cb: (
                fromState: FSMStates<StatesDef>,
                toState: FSMStates<StatesDef>,
                fromPayload: FSMStatePayload<StatesDef, typeof fromState>,
                toPayload: FSMStatePayload<StatesDef, typeof toState>
            ) => void
        ) => {
            eventEmitterRef.current.addListener(EVENT_TRANSITION_DONE, cb)

            return () => {
                eventEmitterRef.current.removeListener(EVENT_TRANSITION_DONE, cb)
            }
        },
        [machineDeclaration]
    )

    const addTriggerInvokeListener = React.useCallback(
        (
            cb: (
                state: FSMStates<StatesDef>,
                payload: FSMStatePayload<StatesDef, typeof state>,
                trigger: FSMStateTriggers<StatesDef, typeof state>,
                ...triggerArgs: FSMStateTriggerArgs<StatesDef, typeof state, typeof trigger>
            ) => void
        ) => {
            eventEmitterRef.current.addListener(EVENT_TRIGGER_INVOKE, cb)

            return () => {
                eventEmitterRef.current.removeListener(EVENT_TRIGGER_INVOKE, cb)
            }
        },
        []
    )

    const machineApi = React.useMemo<FSMachineApi<StatesDef>>(() => ({
        state: curState,
        getPayload,
        isBlocked,
        getAllStates,
        getAllTriggers,
        getStateTriggers,
        invokeStateTrigger,
        addTransitionDoneListener,
        addTriggerInvokeListener,
    }), [
        curState,
        getPayload,
        isBlocked,
        getAllStates,
        getAllTriggers,
        getStateTriggers,
        invokeStateTrigger,
        addTransitionDoneListener,
        addTriggerInvokeListener,
    ])

    useImperativeHandle(apiRef, () => machineApi, [machineApi])

    return (
        <fsMachineContext.Provider value={machineApi}>
            {children}
        </fsMachineContext.Provider>
    )
}

export function useFSMachine<StatesDef extends FSMStatesDef>() {
    return useContext(fsMachineContext) as FSMachineApi<StatesDef>
}

export default FSMachine
