import type { ItemType } from '@shared/types';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { ITEM_TYPES } from '@/lib/itemTypes';
import { space } from '@/theme';
import { AppText } from './AppText';
import { ChoiceChip } from './SeasonPicker';

interface BaseProps {
  label?: string;
  /** prefisso testID dei chip: `item-type`, `box-type`, `search-type` */
  testIDPrefix: string;
}

type Props =
  | (BaseProps & { value: ItemType; onChange: (t: ItemType) => void; noneLabel?: undefined; noneTestID?: undefined })
  | (BaseProps & { value: ItemType | null; onChange: (t: ItemType | null) => void; noneLabel: string; noneTestID: string });

/** Scelta del tipo di oggetto a chip con icona. Con `noneLabel` aggiunge in testa una scelta "nessun tipo" (null). */
export function ItemTypePicker(props: Props) {
  const { label, testIDPrefix, value } = props;
  const { t } = useTranslation();
  const chips = (
    <>
      {props.noneLabel !== undefined ? (
        <ChoiceChip
          testID={props.noneTestID}
          label={props.noneLabel}
          selected={value === null}
          onPress={() => props.onChange(null)}
        />
      ) : null}
      {ITEM_TYPES.map((type) => (
        <ChoiceChip
          key={type.key}
          testID={`${testIDPrefix}-${type.key}`}
          icon={type.icon}
          label={t(`itemTypes.${type.key}`)}
          selected={value === type.key}
          onPress={() => (props.onChange as (t: ItemType) => void)(type.key)}
        />
      ))}
    </>
  );
  return (
    <View style={styles.wrap}>
      {label ? (
        <AppText variant="label" muted>
          {label}
        </AppText>
      ) : null}
      <View style={styles.row}>{chips}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
});
