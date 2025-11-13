import { Button } from "./components/ui/button";
import { ModeToggle } from "./components/mode-toggle";
import "./App.css";
import { atom, useAtom } from "jotai";
const counterAtom = atom(0);

function App() {
  const [count, setCount] = useAtom(counterAtom);

  return (
    <>
      <div className="flex justify-end p-4">
        <ModeToggle />
      </div>
      <div className="flex justify-center items-center min-h-[calc(100vh-80px)]">
        <Button variant="outline" size="lg" onClick={() => setCount(count + 1)}>
          Button {count}
        </Button>
      </div>
    </>
  );
}

export default App;
