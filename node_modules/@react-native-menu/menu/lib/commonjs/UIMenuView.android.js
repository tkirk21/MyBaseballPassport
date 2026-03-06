"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _reactNative = require("react-native");
var _react = require("react");
var _jsxRuntime = require("react/jsx-runtime");
const NativeMenuComponent = (0, _reactNative.requireNativeComponent)("MenuView");
const MenuComponent = /*#__PURE__*/(0, _react.forwardRef)((props, ref) => {
  const nativeRef = (0, _react.useRef)(null);
  (0, _react.useImperativeHandle)(ref, () => ({
    show: () => {
      if (nativeRef.current) {
        const node = (0, _reactNative.findNodeHandle)(nativeRef.current);
        const command = _reactNative.UIManager.getViewManagerConfig("MenuView").Commands.show;
        _reactNative.UIManager.dispatchViewManagerCommand(node, command, undefined);
      }
    }
  }), []);
  return /*#__PURE__*/(0, _jsxRuntime.jsx)(NativeMenuComponent, {
    ...props,
    ref: nativeRef
  });
});
var _default = exports.default = MenuComponent;
//# sourceMappingURL=UIMenuView.android.js.map