import NavBarTop from "../components/NavBarTop";
import NavBarBottom from "../components/NavBarBottom";

import type { Page } from "../App";


type Props = { nav: (p: Page) => void };

export default function Dashboard({ nav }: Props) {
  return (
    <>
      <NavBarTop currentCoins={100} streak={5} userName={"Alexis Ma"} />
      <NavBarBottom />
      <button onClick={() => nav("presession")}>Start session</button>
    </>
  );
}
