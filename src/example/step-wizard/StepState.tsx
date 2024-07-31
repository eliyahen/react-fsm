import React from "react"
import { useFSMachine } from "../../module/FSMachine"
import { FSMStatePayload, FSMStates, FSMStatesDef, FSMStateTriggerArgs, FSMStateTriggers } from "../../module/FSMachine.types"

type StepInvokeTriggerFn<Steps extends FSMStatesDef, StepName extends FSMStates<Steps>, StepTrigger extends FSMStateTriggers<Steps, StepName>> = (
    trigger: StepTrigger,
    ...args: FSMStateTriggerArgs<Steps, StepName, StepTrigger>
) => void

type StepRenderFn<Steps extends FSMStatesDef, StepName extends FSMStates<Steps>> = (
    state: StepName,
    payload: FSMStatePayload<Steps, StepName>,
    invokeTrigger: StepInvokeTriggerFn<Steps, StepName, FSMStateTriggers<Steps, StepName>>
) => React.ReactNode

export interface StepStateProps<
    Steps extends FSMStatesDef = FSMStatesDef,
    StepName extends FSMStates<Steps> = FSMStates<Steps>
> {
    name: StepName
    render: StepRenderFn<Steps, StepName>
}

function StepState<Steps extends FSMStatesDef, StepName extends FSMStates<Steps> = FSMStates<Steps>>({name, render}: StepStateProps<Steps, StepName>) {
    // get current state data from FSMachine
    const { state, getPayload, invokeStateTrigger: invokeTriggerIfState } = useFSMachine<Steps>()

    // make invoke trigger function from the state to inject to the renderer function of the state.
    const invokeTrigger = React.useCallback<StepInvokeTriggerFn<Steps, StepName, FSMStateTriggers<Steps, StepName>>>(
        (trigger, ...args) => {
            invokeTriggerIfState(state)(trigger, ...args)
        },
        [invokeTriggerIfState, state]
    )

    // if current state is this step name, then execute render function
    if (state === name) {
        return render(state, getPayload<typeof state>(), invokeTrigger)
    }

    // otherwise, render nothing
    return undefined
}

export default StepState
