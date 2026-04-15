export const handleResponse = async (res: Response) => {
  if (!res.ok) {
    let message = "Something went wrong";

    try {
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      message = data?.message || message;
    } catch {
      // ignore parse error
    }

    throw new Error(message);
  }

  if (res.status === 204) return null;

  const text = await res.text();
  return text ? JSON.parse(text) : null;
};