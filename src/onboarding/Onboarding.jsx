

import { useState } from "react";


// type Step =
//     | "welcome"
//     | "auth"
//     | "profile";

export default function Onboarding() {
    const [step, setStep] = useState<Step>("welcome");

    switch (step) {
        case "welcome":
            return (
                <Welcome
                    next={() => setStep("auth")}
                />
            );

        case "auth":
            return (
                <Auth
                    next={() => setStep("profile")}
                />
            );

        case "profile":
            return (
                <ProfileSetup />
            );
    }
}