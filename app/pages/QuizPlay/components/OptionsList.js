import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function OptionsList({ options, selectedId, onSelect }) {
  return (
    <View style={styles.container}>
      {options.map((option, index) => {
        const isSelected = selectedId === option.id;
        const letter = String.fromCharCode(65 + index); 

        return (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionCard,
              isSelected && styles.selectedOption,
            ]}
            onPress={() => onSelect(option.id)}
            activeOpacity={0.8}
          >
            <View style={styles.optionLeft}>
              <View style={[styles.letterCircle, isSelected && styles.selectedLetterCircle]}>
                <Text style={[styles.letter, isSelected && styles.selectedLetter]}>
                  {letter}
                </Text>
              </View>

              <Text style={styles.optionText}>{option.option_text}</Text>
            </View>

            {option.option_image && (
              <Image
                source={{ uri: option.option_image }}
                style={styles.optionImage}
                resizeMode="contain"
              />
            )}

            {isSelected && (
              <Ionicons name="checkmark-circle" size={28} color="#059669" />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#ECFDF5',
    borderColor: '#059669',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  letterCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  selectedLetterCircle: {
    backgroundColor: '#059669',
  },
  letter: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
  },
  selectedLetter: {
    color: '#FFFFFF',
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  optionImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginLeft: 10,
  },
});