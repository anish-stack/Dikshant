import React, { useState } from "react";

// Common Indian scholarship categories (you can customize this list)
const COMMON_CATEGORIES = [
  "GEN", "GENERAL", 
  "OBC", "OBC-NCL",
  "SC", "ST",
  "EWS",
  "MINORITY", "MUSLIM", "CHRISTIAN", "SIKH", "BUDDHIST", "JAIN", "PARSI",
  "PWD", "PHYSICALLY DISABLED",
  "WOMEN", "GIRL CHILD",
  "MERIT", "SPORTS", "DEFENCE", "EX-SERVICEMEN"
];

const CategorySelector: React.FC<{
  value: string; 
  onChange: (jsonString: string) => void;
}> = ({ value, onChange }) => {
  let initialTags: string[] = [];
  try {
    initialTags = value ? JSON.parse(value) : [];
  } catch {
    initialTags = [];
  }

  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toUpperCase();
    if (trimmed && !selectedTags.includes(trimmed)) {
      const newTags = [...selectedTags, trimmed];
      setSelectedTags(newTags);
      onChange(JSON.stringify(newTags));
    }
    setInputValue("");
    setIsOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    const newTags = selectedTags.filter((t) => t !== tagToRemove);
    setSelectedTags(newTags);
    onChange(JSON.stringify(newTags));
  };

  const filteredSuggestions = COMMON_CATEGORIES.filter(
    (cat) =>
      cat.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedTags.includes(cat)
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Categories <span className="text-gray-500">(Select or add new)</span>
      </label>

      {/* Selected Tags/Chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {selectedTags.length === 0 ? (
          <span className="text-gray-400 text-sm">No categories selected</span>
        ) : (
          selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="hover:bg-blue-200 rounded-full w-5 h-5 flex items-center justify-center"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      {/* Input + Dropdown */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (inputValue.trim()) {
                addTag(inputValue.trim().toUpperCase());
              }
            } else if (e.key === "Backspace" && inputValue === "" && selectedTags.length > 0) {
              removeTag(selectedTags[selectedTags.length - 1]);
            }
          }}
          placeholder="Type category and press Enter..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Suggestions Dropdown */}
        {isOpen && inputValue && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredSuggestions.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => addTag(cat)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hidden input to keep original field (if needed) */}
      <input type="hidden" name="category" value={JSON.stringify(selectedTags)} />
    </div>
  );
};

export default CategorySelector