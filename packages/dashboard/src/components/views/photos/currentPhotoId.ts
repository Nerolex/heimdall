/**
 * Shared module that tracks the ID of the most recently displayed photo across
 * all photo-showing views (ClockView, PhotosRandomView, PhotosMemoriesView).
 *
 * PhotoSlideshow reads this value to open the timeline centred on the photo
 * the user was just looking at.
 */
export let currentPhotoId: string | null = null;

export function setCurrentPhotoId(id: string | null): void {
  currentPhotoId = id;
}
