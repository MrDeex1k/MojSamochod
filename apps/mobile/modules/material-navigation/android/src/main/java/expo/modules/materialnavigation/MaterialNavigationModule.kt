package expo.modules.materialnavigation

import android.content.Context
import android.content.res.ColorStateList
import android.graphics.Color
import android.view.ContextThemeWrapper
import android.view.Gravity
import android.view.ViewGroup
import com.google.android.material.navigationrail.NavigationRailView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

class MaterialNavigationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MaterialNavigation")
    View(MaterialRailView::class) {
      Events("onSelect")
      Prop("labels") { view: MaterialRailView, labels: List<String> -> view.setLabels(labels) }
      Prop("selectedIndex") { view: MaterialRailView, index: Int -> view.selectedIndex = index }
      Prop("palette") { view: MaterialRailView, palette: List<String> -> view.setPalette(palette) }
    }
  }
}

class MaterialRailView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onSelect by EventDispatcher()
  private val rail = NavigationRailView(ContextThemeWrapper(context, com.google.android.material.R.style.Theme_Material3_Dark_NoActionBar))
  var selectedIndex = 0
    set(value) { field = value; if (rail.menu.size() > value && value >= 0) rail.menu.getItem(value).isChecked = true }
  init {
    rail.menuGravity = Gravity.TOP
    rail.labelVisibilityMode = 1
    rail.setOnItemSelectedListener { item -> onSelect(mapOf("index" to item.itemId - 1)); true }
    addView(rail, LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
  }
  fun setLabels(labels: List<String>) {
    rail.menu.clear()
    val icons = listOf(R.drawable.material_car, R.drawable.material_fuel, R.drawable.material_event, R.drawable.material_settings)
    labels.take(4).forEachIndexed { index, label -> rail.menu.add(0, index + 1, index, label).setIcon(icons[index]) }
    selectedIndex = selectedIndex
  }
  fun setPalette(colors: List<String>) {
    if (colors.size < 5) return
    val parsed = colors.map { Color.parseColor(it.take(7)) }
    rail.setBackgroundColor(parsed[0])
    val states = arrayOf(intArrayOf(android.R.attr.state_checked), intArrayOf())
    val foreground = ColorStateList(states, intArrayOf(parsed[2], parsed[4]))
    rail.itemIconTintList = foreground
    rail.itemTextColor = foreground
    rail.setItemActiveIndicatorColor(ColorStateList.valueOf(parsed[1]))
    rail.itemRippleColor = ColorStateList.valueOf(Color.argb(40, Color.red(parsed[3]), Color.green(parsed[3]), Color.blue(parsed[3])))
  }
  override fun onLayout(changed: Boolean, left: Int, top: Int, right: Int, bottom: Int) {
    rail.measure(MeasureSpec.makeMeasureSpec(right - left, MeasureSpec.EXACTLY), MeasureSpec.makeMeasureSpec(bottom - top, MeasureSpec.EXACTLY))
    rail.layout(0, 0, right - left, bottom - top)
  }
}
