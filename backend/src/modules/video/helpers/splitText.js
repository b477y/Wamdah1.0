const splitText = (text) => {
  const isArabic =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(
      text
    );

  let sentences;

  if (isArabic) {
    sentences = text
      .split(/([.؟!\u06D4]+)/)
      .reduce((result, current, index, array) => {
        if (!current.trim()) return result;

        if (/^[.؟!\u06D4]+$/.test(current)) {
          if (result.length > 0) {
            result[result.length - 1] += current;
          } else {
            result.push(current);
          }
        } else if (
          index + 1 >= array.length ||
          !/^[.؟!\u06D4]+$/.test(array[index + 1])
        ) {
          result.push(current);
        } else {
          result.push(current);
        }
        return result;
      }, []);
  } else {
    sentences = text
      .split(/([.?!]+\s*)/)
      .reduce((result, current, index, array) => {
        if (!current.trim()) return result;

        if (/[.?!]+\s*$/.test(current)) {
          result.push(current);
        } else if (
          index + 1 < array.length &&
          /^[.?!]+\s*$/.test(array[index + 1])
        ) {
          result.push(current);
        } else {
          result.push(current);
        }
        return result;
      }, []);
  }

  return sentences
    .filter((sentence) => sentence.trim().length > 0)
    .map((sentence) => sentence.trim());
};

export default splitText;
