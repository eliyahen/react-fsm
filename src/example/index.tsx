import MultiFactorAuthLoginProvider from "./MultiFactorAuthLoginProvider"
import MultiFactorAuthLoginWizard from "./MultiFactorAuthLoginWizard"

function Example() {
    return (
        <div className="main">
            <MultiFactorAuthLoginProvider preferrableSendMethod="sms">
                <MultiFactorAuthLoginWizard />
            </MultiFactorAuthLoginProvider>
        </div>
    )
}

export default Example
