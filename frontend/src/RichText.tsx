import { Text, type TextStyle, type StyleProp } from "react-native";
import { useRouter } from "expo-router";
import type { Span } from "./api";
import { openLink } from "./links";
import { colors } from "./theme";

// Text where links are tappable (red + underlined).
export function RichText({ spans, style }: { spans: Span[]; style?: StyleProp<TextStyle> }) {
  const router = useRouter();
  return (
    <Text style={style}>
      {spans.map((s, i) =>
        s.href ? (
          <Text
            key={i}
            accessibilityRole="link"
            style={{ color: colors.brandPrimary, textDecorationLine: "underline" }}
            onPress={() => openLink(s.href!, router)}
          >
            {s.text}
          </Text>
        ) : (
          s.text
        ),
      )}
    </Text>
  );
}
