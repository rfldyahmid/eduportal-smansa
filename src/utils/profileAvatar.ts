import type { UserAccount } from '../types';
import { IMAGES } from '../assets/images';

export function getProfileAvatar(user: Pick<UserAccount, 'avatarUrl' | 'gender'>): string {
  if (user.avatarUrl) return user.avatarUrl;
  if (user.gender === 'Laki-laki') return IMAGES.defaultAvatarMale;
  if (user.gender === 'Perempuan') return IMAGES.defaultAvatarFemale;
  return IMAGES.defaultAvatarNeutral;
}
