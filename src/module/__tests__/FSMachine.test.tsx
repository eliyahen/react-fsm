import React from 'react'
import {renderHook, RenderHookResult, act} from '@testing-library/react'
import '@testing-library/jest-dom'
import FSMachine, { useFSMachine } from '../FSMachine'
import { FSMachineApi, FSMStatesTriggersDef } from '../FSMachine.types';

type MyLoginMachine = {
    credentials: {
        payload: undefined
        triggers: {
            verify: (email: string, password: string) => void
            verifyAsync: (email: string, password: string) => void
        }
    }
    verifySuccess: {
        payload: { userId: string, userName: string }
        triggers: {}
    }
    verifyFail: {
        payload: undefined
        triggers: {
            retry: () => void
        }
    }
}

const stateTriggers: FSMStatesTriggersDef<MyLoginMachine> = {
    credentials: {
        verify: (api) => () => {
            // do stuff - verify credentials
            const success = true
            
            if (success) {
                // transition to state "verifySuccess" with the given payload
                api.transition('verifySuccess', { userId: "u1", userName: 'ADMIN' })
            } else {
                // transition to state with no payload
                api.transition('verifyFail', undefined)
            }
        },
        verifyAsync: (api) => () => new Promise((resolve) => {
            setTimeout(() => {
                api.transition('verifySuccess', { userId: 'u1', userName: 'ADMIN' })
                resolve(undefined)
            }, 1000)
        })
    },
    verifySuccess: {},
    verifyFail: {
        retry: (api) => () => api.transition('credentials', undefined)
    },
}

describe('FSMachine provider', () => {
    let rawHookResult: RenderHookResult<FSMachineApi<MyLoginMachine>, undefined>
    let hookResult: React.RefObject<FSMachineApi<MyLoginMachine>>

    beforeEach(() => {
        const wrapper = ({children}: {children: React.ReactNode}) => (
            <FSMachine<MyLoginMachine> statesTriggers={stateTriggers} initialState="credentials" initialStatePayload={undefined}>
                {children}
            </FSMachine>
        )
        rawHookResult = renderHook(() => useFSMachine<MyLoginMachine>(), {wrapper})
        hookResult = rawHookResult.result
    })

    it('should initialize to the first state', () => {
        expect(hookResult.current?.state).toBe('credentials')
    })

    it('should change state to "verifySuccess" with user payload', async () => {
        await act(async () => {
            await hookResult.current?.invokeStateTrigger('credentials')('verify')('user@mail.com', 'pass1234')
        })

        expect(hookResult.current?.state).toBe('verifySuccess')
        expect(hookResult.current?.getPayload()?.userId).toBe('u1')
    })

    it('should get all available states', () => {
        expect(hookResult.current?.getAllStates()).toEqual(Object.keys(stateTriggers))
    })

    it('should return all available triggers of state "credentials"', () => {
        expect(hookResult.current?.getStateTriggers('credentials')).toEqual(Object.keys(stateTriggers['credentials']))
    })

    it('should get all available triggers for all states', () => {
        expect(hookResult.current?.getAllTriggers()).toEqual(Object.values(stateTriggers).flatMap((triggersObj) => Object.keys(triggersObj)))
    })

    it('should return no triggers from state "verifySuccess"', () => {
        expect(hookResult.current?.getStateTriggers('verifySuccess')).toHaveLength(0)
    })

    it('should call trigger invoke handler when a trigger is called', async () => {
        const handler = jest.fn()
        hookResult.current?.addTriggerInvokeListener(handler)

        await act(async () => {
            await hookResult.current?.invokeStateTrigger('credentials')('verify')('user@mail.com', 'pass1234')
        })

        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledWith('credentials', undefined, 'verify', 'user@mail.com', 'pass1234')
    })

    it('should not call trigger invoke handler when a trigger is called, after the handler was removed', async () => {
        const handler = jest.fn()
        const cancelListener = hookResult.current?.addTriggerInvokeListener(handler)
        cancelListener?.()

        await act(async () => {
            await hookResult.current?.invokeStateTrigger('credentials')('verify')('user@mail.com', 'pass1234')
        })

        expect(handler).toHaveBeenCalledTimes(0)
    })

    it('should call transition change handler when a transition was made', async () => {
        const handler = jest.fn()
        hookResult.current?.addTransitionDoneListener(handler)

        await act(async () => {
            await hookResult.current?.invokeStateTrigger('credentials')('verify')('user@mail.com', 'pass1234')
        })

        expect(handler).toHaveBeenCalledTimes(1)
        expect(handler).toHaveBeenCalledWith('credentials', 'verifySuccess', undefined, { userId: 'u1', userName: 'ADMIN'})
    })

    it('should not call trigger invoke handler when a trigger is called, after the handler was removed', async () => {
        const handler = jest.fn()
        const cancelListener = hookResult.current?.addTransitionDoneListener(handler)
        cancelListener?.()

        await act(async () => {
            await hookResult.current?.invokeStateTrigger('credentials')('verify')('user@mail.com', 'pass1234')
        })

        expect(handler).toHaveBeenCalledTimes(0)
    })

    it('should set isBlocked flag when triggering an async function', async () => {
        act(() => {
            // do not await for trigger so we can see the machine is blocked
            hookResult.current?.invokeStateTrigger('credentials')('verifyAsync')('user@mail.com', 'pass1234')
        })

        expect(hookResult.current?.isBlocked).toBe(true)
    })
})
