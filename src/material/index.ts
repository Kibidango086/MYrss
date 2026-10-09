// Barrel export file for src/material/
export { MaterialProvider, useMaterialTheme, ThemeContext } from "./provider.js"
export { Card, Dialog, FloatingSurface, StateLayer, Tooltip, Menu, MenuItem, MenuDivider, BottomSheet } from "./surfaces.js"
export { FilledTextField, OutlinedTextField, Checkbox, RadioOption, Switch, Slider, RangeSlider } from "./inputs.js"
export { TopAppBar, NavigationRail, NavigationDrawer, NavigationItem, Tabs, NavigationBar, SegmentedButton } from "./navigation.js"
export type { TabItem, NavigationDestination, SegmentedButtonItem } from "./navigation.js"
export { Button, FAB, FAB as Fab, IconButton, AssistChip, FilterChip, InputChip, SuggestionChip, TextLink } from "./actions.js"
export { Snackbar, CircularProgress, LinearProgress, Badge } from "./feedback.js"
export type { CircularProgressProps, LinearProgressProps, BadgeProps } from "./feedback.js"
export { LayoutShell, ContentContainer, LayoutFooter, Divider, ListItem, LayoutPane, Grid, SectionHeader } from "./layout.js"
export { useRipple, RIPPLE_OPACITY, RIPPLE_RADIUS_DURATION, RIPPLE_FADE_DURATION } from "./ripple.js"
export type { RippleControls } from "./ripple.js"
// Accessibility: every interactive component takes these props and expands them
// into GPUIX's `aria-*` host props with `a11y()`.
export type { A11yProps } from "./shared.js"
