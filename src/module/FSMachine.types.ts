export type FSMStatesDef<State extends string = string> = {
    [state in State]: {
        payload?: unknown
        triggers?: {
            [trigger: string]: (...args: any) => void
        }
    }
}

export type FSMStates<StatesDef extends FSMStatesDef> = StatesDef extends infer U ? keyof U : never
export type FSMStatePayload<StatesDef extends FSMStatesDef, State extends FSMStates<StatesDef>> =
    StatesDef[State] extends { payload: infer U } ? U : undefined
export type FSMStateTriggers<StatesDef extends FSMStatesDef, State extends FSMStates<StatesDef>> =
    StatesDef[State]['triggers'] extends infer U ? keyof U : never
export type FSMStateTriggerFn<StatesDef extends FSMStatesDef, State extends FSMStates<StatesDef>, Trigger extends FSMStateTriggers<StatesDef, State>> =
    StatesDef[State]['triggers'][Trigger] extends infer U ? U : never
export type FSMStateTriggerArgs<StatesDef extends FSMStatesDef, State extends FSMStates<StatesDef>, Trigger extends FSMStateTriggers<StatesDef, State>> =
    FSMStateTriggerFn<StatesDef, State, Trigger> extends (...args: infer U) => void ? U : never

export type FSMStatesTriggersDef<StatesDef extends FSMStatesDef, State extends FSMStates<StatesDef> = FSMStates<StatesDef>> = {
    [state in State]: {
        [trigger in FSMStateTriggers<StatesDef, state>]: (api: FSMTransitionApi<StatesDef, state>) => (...args: any[]) => void
    }
}

/**
 * FSMachine API supplied for triggering.
 */
export interface FSMTransitionApi<StatesDef extends FSMStatesDef, CurState extends FSMStates<StatesDef> = FSMStates<StatesDef>> {
    /**
     * Current state.
     */
    state: CurState

    /**
     * Current state payload.
     */
    payload: FSMStatePayload<StatesDef, CurState>

    /**
     * Blocked status of the machine.
     * The machine is blocked when the invoked trigger function is async.
     * 
     * Note: If you want async operations between states, it would be better to define means state and make the async operations outside the machine.
     *      Then trigger to another state immediately after the async operation is done.
     */
    isBlocked: boolean

    /**
     * Gets all states.
     * 
     * @returns list of all states
     */
    getAllStates: () => FSMStates<StatesDef>[]

    /**
     * Makes a transition to target state.
     * 
     * @param state target state
     * @param payload target state payload
     */
    transition: <State extends FSMStates<StatesDef>>(
        state: State,
        payload: FSMStatePayload<StatesDef, State>
    ) => void
}

export interface FSMachineApi<
    StatesDef extends FSMStatesDef,
    CurState extends FSMStates<StatesDef> = FSMStates<StatesDef>
> extends Omit<FSMTransitionApi<StatesDef, CurState>, 'transition' | 'payload'> {
    /**
     * Gets state payload.
     * Fill the generic type for the method to associate with return data type.
     */
    getPayload: <State extends FSMStates<StatesDef>>() => FSMStatePayload<StatesDef, State>

    /**
     * Gets all triggers from all states.
     * 
     * @returns list of all triggers
     */
    getAllTriggers: () => FSMStateTriggers<StatesDef, FSMStates<StatesDef>>[]

    /**
     * Gets all triggers for a given state.
     * 
     * @param state
     * @returns list of all triggers of the given state
     */
    getStateTriggers: <State extends FSMStates<StatesDef>>(state: State) => FSMStateTriggers<StatesDef, State>[]

    /**
     * Invokes trigger only if the current state is the given state.
     * 
     * Call this with the current "state" to invoke a valid trigger.
     * The "state" parameter is used to ensure safe triggers from async functions.
     * 
     * Though trigger functions should be synchronous, this function still returns a promise for a case the trigger function is async.
     * 
     * @param state state to match invoke trigger from
     * @returns function that get state trigger name, which returns the trigger function itself.
     */
    invokeStateTrigger: <State extends FSMStates<StatesDef>>(state: State) =>
        <Trigger extends FSMStateTriggers<StatesDef, State>>(trigger: Trigger) =>
            (...args: FSMStateTriggerArgs<StatesDef, State, Trigger>
) => Promise<void>

    /**
     * Adds an event listener for transition done.
     * 
     * @param cb event handler callback
     * @returns cancel function for the event listener
     */
    addTransitionDoneListener: (
        cb: <FromState extends FSMStates<StatesDef>, ToState extends FSMStates<StatesDef>>(
            fromState: FromState,
            toState: ToState,
            fromPayload: FSMStatePayload<StatesDef, FromState>,
            toPayload: FSMStatePayload<StatesDef, ToState>
        ) => void
    ) => () => void

    /**
     * Adds an event listener for trigger invoke.
     * 
     * @param cb event handler callback
     * @returns cancel function for the event listener
     */
    addTriggerInvokeListener: (
        cb: <State extends FSMStates<StatesDef>, Trigger extends FSMStateTriggers<StatesDef, State>>(
            state: State,
            payload: FSMStatePayload<StatesDef, State>,
            trigger: Trigger,
            ...triggerArgs: FSMStateTriggerArgs<StatesDef, State, Trigger>
        ) => void
    ) => () => void
}

export interface FSMachineProps<
    StatesDef extends FSMStatesDef = FSMStatesDef,
    InitialState extends FSMStates<StatesDef> = FSMStates<StatesDef>
> {
    /**
     * Initial state of the machine.
     */
    initialState: InitialState

    /**
     * Initial state payload.
     */
    initialStatePayload: FSMStatePayload<StatesDef, InitialState>

    /**
     * Declaration of all states and their triggers in the finite state machine.
     */
    statesTriggers: FSMStatesTriggersDef<StatesDef>

    /**
     * Imperative handler for machine API.
     */
    apiRef?: React.Ref<FSMachineApi<StatesDef>>

    /**
     * Fires when a transition is done.
     * 
     * @param fromState state transitioned from
     * @param toState state transitioned to
     * @param fromPayload state payload transitioned from
     * @param toPayload state payload transitioned to
     */
    onTransitionDone?: <FromState extends FSMStates<StatesDef>, ToState extends FSMStates<StatesDef>>(
        fromState: FromState,
        toState: ToState,
        fromPayload: FSMStatePayload<StatesDef, FromState>,
        toPayload: FSMStatePayload<StatesDef, ToState>
    ) => void

    /**
     * Fires when a trigger is invoked.
     * 
     * @param state current state
     * @param payload current state payload
     * @param trigger the trigger invoked
     * @param triggerArgs the trigger args invoked with the trigger
     */
    onTriggerInvoke?: <State extends FSMStates<StatesDef>, Trigger extends FSMStateTriggers<StatesDef, State>>(
        state: State,
        payload: FSMStatePayload<StatesDef, State>,
        trigger: Trigger,
        ...triggerArgs: FSMStateTriggerArgs<StatesDef, State, Trigger>
    ) => void
}
