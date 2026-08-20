import { createPetPhotoUploadTarget } from '../lib/storage';

describe('private pet photo storage', () => {
  it('places photos below the authenticated user folder', () => {
    expect(
      createPetPhotoUploadTarget(
        'user-123',
        { uri: 'file:///moka.jpg', fileName: 'moka.jpg', mimeType: 'image/jpg' },
        123456,
        'fixed',
      ),
    ).toEqual({
      mimeType: 'image/jpeg',
      path: 'user-123/pets/123456-fixed.jpeg',
    });
  });

  it('uses a safe image fallback when picker metadata is incomplete', () => {
    expect(
      createPetPhotoUploadTarget(
        'user-456',
        { uri: 'file:///picked-image' },
        654321,
        'fallback',
      ),
    ).toEqual({
      mimeType: 'image/jpeg',
      path: 'user-456/pets/654321-fallback.jpeg',
    });
  });
});
