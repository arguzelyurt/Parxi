// Oyunun yazı tipi: Nunito (yuvarlak hatlı, okunaklı, göz yormaz).
// Özel yazı tiplerinde kalınlık ayrı dosya olduğu için fontWeight burada aileye çevrilir.
import React from 'react';
import { StyleSheet, Text as RNText, TextProps, TextStyle } from 'react-native';

export const FONTS = {
  regular: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  extra: 'Nunito_800ExtraBold',
  black: 'Nunito_900Black',
};

let enabled = false;
/** Yazı tipleri yüklenince App açar (yüklenemezse sistem yazısı kalır). */
export const enableFonts = (on: boolean) => {
  enabled = on;
};

export function familyFor(weight: TextStyle['fontWeight']): string {
  const w = Number(weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : weight);
  if (w >= 900) return FONTS.black;
  if (w >= 800) return FONTS.extra;
  if (w >= 700) return FONTS.bold;
  return FONTS.regular;
}

export function fontStyle(style: TextProps['style']): TextStyle | undefined {
  if (!enabled) return undefined;
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  if (flat.fontFamily) return undefined;
  // Android'de özel ailede fontWeight ayrıca verilirse yanlış dosya seçilebilir: ağırlığı aile taşır
  return { fontFamily: familyFor(flat.fontWeight), fontWeight: 'normal' };
}

export function Text(props: TextProps) {
  return <RNText {...props} style={[props.style, fontStyle(props.style)]} />;
}
