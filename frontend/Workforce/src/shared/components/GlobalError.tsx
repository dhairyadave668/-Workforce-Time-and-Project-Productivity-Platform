import MainLayout from "./layout/MainLayout";

type Props = {
  message?: string;
};

export default function GlobalError({ message }: Props) {
  return (
    <MainLayout>
      <div className="h-screen flex flex-col items-center justify-center bg-gray-100">
        <h1 className="text-3xl font-bold text-red-600">
          🚫 {message || "Something went wrong"}
        </h1>

        <p className="mt-3 text-gray-600">
          Please try again later.
        </p>

        <button
          onClick={() => window.location.reload()}
          className="mt-5 px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          Reload Page
        </button>
      </div>
    </MainLayout>
  );
}