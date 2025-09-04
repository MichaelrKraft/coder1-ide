const DataForm = <T extends object>({
  item,
  onSubmit,
  onCancel,
}: DataFormProps<T>) => {
  const [formData, setFormData] = useState<T | null>(item);

  useEffect(() => {
    setFormData(item);
  }, [item]);