export function renderModelsDropdown(models, select, activeModel) {
  if (models.length === 0) {
    select.innerHTML = '<option value="">No models found</option>';
    return;
  }

  select.innerHTML = models.map((model) => {
    const sizeGB = (model.size / (1024 * 1024 * 1024)).toFixed(1);
    return `<option value="${model.name}" ${model.name === activeModel ? 'selected' : ''}>${model.name} (${sizeGB} GB)</option>`;
  }).join('');
}
