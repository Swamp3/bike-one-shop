import { Metadata } from "next"

import LoginTemplate from "@modules/account/templates/login-template"

export const metadata: Metadata = {
  title: "Anmelden",
  description: "Melde dich bei deinem BikeOne-Konto an.",
}

export default function Login() {
  return <LoginTemplate />
}
