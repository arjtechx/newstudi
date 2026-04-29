// This is a simplified helper to demonstrate streaming from a server action.
// In a real app, you might use a more robust library or Next.js's built-in streaming capabilities.

type StreamedData<U> = Record<string, any> & U;

export function StreamToClient<T, U>(
  action: (input: T) => AsyncGenerator<StreamedData<U>>
) {
  return async function (input: T): Promise<ReadableStream<StreamedData<U>>> {
    const iterator = action(input);

    const stream = new ReadableStream<StreamedData<U>>({
      async pull(controller) {
        const { value, done } = await iterator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      },
    });

    return stream;
  };
}
