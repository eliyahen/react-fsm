import React from "react"
import FSMachine from "../../module/FSMachine"
import { FSMStatePayload, FSMStates, FSMStatesDef, FSMStatesTriggersDef } from "../../module/FSMachine.types"
import { StepStateProps } from "./StepState"

interface StepStateWizardProps<Steps extends FSMStatesDef = FSMStatesDef, InitialStep extends FSMStates<Steps> = FSMStates<Steps>> {
    stepsTriggers: FSMStatesTriggersDef<Steps>
    initialStep: InitialStep
    initialStepPayload: FSMStatePayload<Steps, InitialStep>
    children: React.ReactElement<StepStateProps<Steps, FSMStates<Steps>>>[]
}

function StepStateWizard<Steps extends FSMStatesDef = FSMStatesDef>({children, stepsTriggers, initialStep, initialStepPayload}: StepStateWizardProps<Steps>) {
    return (
        <FSMachine<Steps> statesTriggers={stepsTriggers} initialState={initialStep} initialStatePayload={initialStepPayload}>
            {children}
        </FSMachine>
    )
}

export default StepStateWizard
