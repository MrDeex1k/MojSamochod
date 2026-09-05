package expo.modules.documentpreview

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.util.UUID
import kotlin.math.max
import kotlin.math.min

class DocumentPreviewModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DocumentPreview")

    AsyncFunction("renderPage") { uri: String, pageIndex: Int ->
      val context = requireNotNull(appContext.reactContext)
      val sourceUri = Uri.parse(uri)
      require(sourceUri.scheme == "file")
      val source = File(requireNotNull(sourceUri.path)).canonicalFile
      val root = File(context.filesDir, "managed-objects/objects").canonicalFile
      require(source.path.startsWith(root.path + File.separator))
      ParcelFileDescriptor.open(source, ParcelFileDescriptor.MODE_READ_ONLY).use { descriptor ->
        PdfRenderer(descriptor).use { renderer ->
          require(pageIndex >= 0 && pageIndex < renderer.pageCount)
          renderer.openPage(pageIndex).use { page ->
            require(page.width > 0 && page.height > 0)
            val scale = min(1600.0 / page.width, 1600.0 / page.height)
            val bitmap = Bitmap.createBitmap(max(1, (page.width * scale).toInt()), max(1, (page.height * scale).toInt()), Bitmap.Config.ARGB_8888)
            try {
              bitmap.eraseColor(Color.WHITE)
              page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
              val directory = File(context.cacheDir, "document-previews")
              check(directory.isDirectory || directory.mkdirs())
              val output = File(directory, UUID.randomUUID().toString() + ".png")
              try {
                output.outputStream().use { check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, it)) }
              } catch (error: Exception) {
                output.delete()
                throw error
              }
              mapOf("uri" to Uri.fromFile(output).toString(), "pageCount" to renderer.pageCount, "text" to "")
            } finally {
              bitmap.recycle()
            }
          }
        }
      }
    }
  }
}
