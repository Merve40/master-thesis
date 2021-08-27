import Header from "./components/header";
import Form from "./components/form";
import Web3 from "web3";

function App() {
  const web3 = new Web3(
    new Web3.providers.WebsocketProvider(process.env.REACT_APP_WEB3)
  );

  return (
    <div className="App">
      <Header />
      <Form web3={web3} />
    </div>
  );
}

export default App;
