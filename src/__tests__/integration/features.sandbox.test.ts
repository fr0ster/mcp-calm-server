import { createExternalReferenceTool } from '../../tools/features/createExternalReference';
import { deleteExternalReferenceTool } from '../../tools/features/deleteExternalReference';
import { getFeatureTool } from '../../tools/features/getFeature';
import { getFeatureByDisplayIdTool } from '../../tools/features/getFeatureByDisplayId';
import { listFeaturePrioritiesTool } from '../../tools/features/listFeaturePriorities';
import { listFeatureStatusesTool } from '../../tools/features/listFeatureStatuses';
import { listFeaturesTool } from '../../tools/features/listFeatures';
import {
  ctx,
  describeSandbox,
  describeWithProject,
  PROJECT_ID,
} from './_sandbox';

describeSandbox('features tools (sandbox)', () => {
  describe('calm_features_list_statuses', () => {
    it('returns the static status catalog', async () => {
      const res = await listFeatureStatusesTool.handler(await ctx(), {});
      expect(Array.isArray(res.items)).toBe(true);
      expect(res.items.length).toBeGreaterThan(0);
      expect(res.items[0]).toHaveProperty('code');
      expect(res.items[0]).toHaveProperty('name');
    });
  });

  describe('calm_features_list_priorities', () => {
    it('returns the static priority catalog', async () => {
      const res = await listFeaturePrioritiesTool.handler(await ctx(), {});
      expect(Array.isArray(res.items)).toBe(true);
      expect(res.items.length).toBeGreaterThan(0);
    });
  });

  // CRUD mutations (create/update/delete + external references)
  // intentionally NOT exercised against the shared sandbox.
  describe('mutation argument validation (no network)', () => {
    it('create_external_reference rejects missing parentUuid', async () => {
      await expect(
        createExternalReferenceTool.handler(await ctx(), {
          id: 'JIRA-1',
          name: 'N',
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });

    it('delete_external_reference rejects missing id', async () => {
      await expect(
        deleteExternalReferenceTool.handler(await ctx(), {
          parentUuid: 'f1',
        } as never),
      ).rejects.toMatchObject({ code: 'INVALID_ARGUMENT' });
    });
  });

  describeWithProject('project-scoped reads (needs CALM_PROJECT_ID)', () => {
    it('lists features for the configured project', async () => {
      const res = await listFeaturesTool.handler(await ctx(), {
        projectId: PROJECT_ID as string,
        limit: 3,
      });
      expect(Array.isArray(res.items)).toBe(true);
    });

    it('chains list → get by uuid when the project has features', async () => {
      const list = await listFeaturesTool.handler(await ctx(), {
        projectId: PROJECT_ID as string,
        limit: 1,
      });
      if (list.items.length === 0) return;
      const uuid = (list.items[0] as { uuid?: string }).uuid;
      if (!uuid) return;
      const res = await getFeatureTool.handler(await ctx(), { uuid });
      expect(res).toHaveProperty('uuid', uuid);
    });

    it('chains list → getByDisplayId when the project has features', async () => {
      const list = await listFeaturesTool.handler(await ctx(), {
        projectId: PROJECT_ID as string,
        limit: 1,
        fields: ['uuid', 'displayId', 'title'] as never,
      });
      if (list.items.length === 0) return;
      const displayId = (list.items[0] as { displayId?: string }).displayId;
      if (!displayId) return;
      const res = await getFeatureByDisplayIdTool.handler(await ctx(), {
        projectId: PROJECT_ID as string,
        displayId,
      });
      expect(res).toHaveProperty('displayId', displayId);
    });
  });
});
