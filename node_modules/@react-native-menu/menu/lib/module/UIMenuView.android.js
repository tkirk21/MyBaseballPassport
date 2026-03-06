"use strict";

import { findNodeHandle, requireNativeComponent, UIManager } from "react-native";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { jsx as _jsx } from "react/jsx-runtime";
const NativeMenuComponent = requireNativeComponent("MenuView");
const MenuComponent = /*#__PURE__*/forwardRef((props, ref) => {
  const nativeRef = useRef(null);
  useImperativeHandle(ref, () => ({
    show: () => {
      if (nativeRef.current) {
        const node = findNodeHandle(nativeRef.current);
        const command = UIManager.getViewManagerConfig("MenuView").Commands.show;
        UIManager.dispatchViewManagerCommand(node, command, undefined);
      }
    }
  }), []);
  return /*#__PURE__*/_jsx(NativeMenuComponent, {
    ...props,
    ref: nativeRef
  });
});
export default MenuComponent;
//# sourceMappingURL=UIMenuView.android.js.map