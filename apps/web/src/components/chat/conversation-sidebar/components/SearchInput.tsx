import { TextInput } from "@/components/ui/text-input";

export function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="px-4 pb-2">
      <TextInput
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search"
      />
    </div>
  );
}
