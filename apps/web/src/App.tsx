import { APP_NAME } from "@nextgame/shared";

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">{APP_NAME}</h1>
        <p className="mt-4 text-lg text-gray-400">
          Game discovery &amp; backlog management — coming soon.
        </p>
      </div>
    </div>
  );
}

export default App;
