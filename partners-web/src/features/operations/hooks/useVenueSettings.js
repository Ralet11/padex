import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/runtime';
import { createVenueFormState } from '../lib/selectors';

export function useVenueSettings({ venue, onVenueRefresh }) {
  const [venueForm, setVenueForm] = useState(() => createVenueFormState(venue));
  const [isSavingVenue, setIsSavingVenue] = useState(false);
  const [isUploadingVenueImage, setIsUploadingVenueImage] = useState(false);

  useEffect(() => {
    setVenueForm(createVenueFormState(venue));
  }, [venue]);

  const handleSaveVenue = useCallback(async () => {
    if (!venueForm.name.trim()) {
      alert('Ingresa el nombre de la sede.');
      return;
    }

    setIsSavingVenue(true);
    try {
      await api.put('/partners/venue', {
        name: venueForm.name,
        address: venueForm.address,
        phone: venueForm.phone,
        image: venueForm.image,
        price_per_slot: venueForm.price_per_slot === '' ? 0 : Number(venueForm.price_per_slot),
        services: venueForm.services,
      });
      await onVenueRefresh?.();
    } catch (err) {
      alert(`Error guardando la sede: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSavingVenue(false);
    }
  }, [onVenueRefresh, venueForm]);

  const handleVenueImageSelected = useCallback(async (file) => {
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    setIsUploadingVenueImage(true);
    try {
      const response = await api.post('/partners/venue/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVenueForm((prev) => ({ ...prev, image: response.data.image || prev.image }));
      await onVenueRefresh?.();
    } catch (err) {
      alert(`Error subiendo imagen: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsUploadingVenueImage(false);
    }
  }, [onVenueRefresh]);

  return {
    venueForm,
    setVenueForm,
    isSavingVenue,
    isUploadingVenueImage,
    handleSaveVenue,
    handleVenueImageSelected,
    resetVenueForm: () => setVenueForm(createVenueFormState(venue)),
  };
}
