package expo.modules.documentpreview

import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class DocumentImportModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DocumentImport")
    AsyncFunction("copyToStaging") { source: String, destination: String, limit: Int ->
      val context = requireNotNull(appContext.reactContext)
      val uri = Uri.parse(source)
      val target = Uri.parse(destination)
      require(uri.scheme == "content" && target.scheme == "file" && limit > 0)
      val file = File(requireNotNull(target.path)).canonicalFile
      require(file.parentFile == File(context.filesDir, "managed-objects/staging").canonicalFile)
      var completed = false
      try {
        requireNotNull(context.contentResolver.openInputStream(uri)).use { input ->
          val valid = file.outputStream().use write@{ output ->
            val buffer = ByteArray(64 * 1024)
            var remaining = limit
            while (true) {
              val count = input.read(buffer, 0, minOf(buffer.size - 1, remaining) + 1)
              if (count < 0) break
              if (count == 0 || count > remaining) return@write false
              output.write(buffer, 0, count)
              remaining -= count
            }
            remaining < limit
          }
          completed = valid
          valid
        }
      } finally {
        if (!completed) file.delete()
      }
    }
  }
}
