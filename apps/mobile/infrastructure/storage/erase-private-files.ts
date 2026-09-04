import { Directory, Paths } from "expo-file-system";
import { Image } from "expo-image";

/** Only fixed application-owned directories; never picker source URIs or a filesystem root. */
export async function erasePrivateFiles(): Promise<void> {
  const directories = [
    new Directory(Paths.document, "managed-objects"),
    ...["document-exports", "DocumentPicker", "ImagePicker", "ImageManipulator"].map(
      (name) => new Directory(Paths.cache, name),
    ),
  ];
  for (const directory of directories) {
    if (directory.exists) directory.delete();
  }
  if (!(await Image.clearMemoryCache()) || !(await Image.clearDiskCache())) {
    throw new Error("Image cache cleanup did not complete");
  }
}
