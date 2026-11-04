export function renderModelsDropdown(models, select, activeModel) {
  if (models.length === 0) {
    select.innerHTML = '<option value="">No models found</option>';
    return;
  }

  const options = models.map((model) => {
    const option = document.createElement('option');
    option.value = model.name;
    option.textContent = Number.isFinite(model.size) && model.size > 0
      ? `${model.name} (${(model.size / (1024 * 1024 * 1024)).toFixed(1)} GB)`
      : model.name;
    option.selected = model.name === activeModel;
    return option;
  });
  select.replaceChildren(...options);
}
