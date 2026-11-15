import { useToast } from "@ui";

/** Copies text and says so in a toast, or says the browser blocked it. */
const useCopyText = () => {
  const toast = useToast();
  return (text: string, done: string) =>
    navigator.clipboard.writeText(text).then(
      () => toast.show({ status: "success", message: done }),
      () =>
        toast.show({
          status: "error",
          message: "Couldn’t copy. Your browser blocked it.",
        }),
    );
};

export default useCopyText;
