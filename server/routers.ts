import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats,
  getTransactionsByCategory,
  getCategories,
  createCategory,
  autoCategorizeTransaction,
  getPaymentMethods,
  createPaymentMethod,
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetProgress,
  getUserSettings,
  updateUserSettings,
  getTags,
  createTag,
  deleteTag,
  addTagToTransaction,
  removeTagFromTransaction,
  getTransactionTags,
} from "./db";

// WhatsApp Bot é inicializado em server/_core/index.ts

import { driveService } from "./services/drive";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res?.clearCookie("session");
      return { success: true };
    }),
  }),


  backup: router({
    create: protectedProcedure.mutation(async ({ ctx }) => {
      const user = ctx.user;
      if (!user || !user.googleAccessToken) {
        throw new Error("Usuário não conectado ao Google ou sem permissão de Drive.");
      }

      try {
        const result = await driveService.uploadBackup(user.googleAccessToken);
        return { success: true, fileId: result.id, link: result.webViewLink };
      } catch (error) {
        console.error("Backup failed:", error);
        throw new Error("Falha ao realizar backup no Google Drive.");
      }
    })
  }),

  // ============ TRANSAÇÕES ============
  transactions: router({
    list: publicProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return await getTransactions({ startDate: input.startDate, endDate: input.endDate });
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getTransactionById(input.id);
      }),

    create: publicProcedure
      .input(
        z.object({
          type: z.enum(["income", "expense"]),
          amount: z.number().positive(),
          category: z.string(),
          description: z.string().optional(),
          date: z.string(),
          paymentMethod: z.string().optional(),
          isRecurring: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const transaction = await createTransaction({
          type: input.type,
          amount: input.amount.toString(),
          category: input.category,
          description: input.description || "",
          date: input.date,
          paymentMethod: input.paymentMethod || "outro",
          isRecurring: input.isRecurring || false,
        });

        return transaction;
      }),

    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          type: z.enum(["income", "expense"]).optional(),
          amount: z.number().positive().optional(),
          category: z.string().optional(),
          description: z.string().optional(),
          date: z.string().optional(),
          paymentMethod: z.string().optional(),
          isRecurring: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: any = {};

        if (data.type) updateData.type = data.type;
        if (data.amount) updateData.amount = data.amount.toString();
        if (data.category) updateData.category = data.category;
        if (data.description) updateData.description = data.description;
        if (data.date) updateData.date = data.date;
        if (data.paymentMethod) updateData.paymentMethod = data.paymentMethod;
        if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;

        await updateTransaction(id, updateData);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteTransaction(input.id);
        return { success: true };
      }),

    stats: publicProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return await getTransactionStats(input.startDate, input.endDate);
      }),

    byCategory: publicProcedure
      .input(
        z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        return await getTransactionsByCategory(input.startDate, input.endDate);
      }),
  }),

  // ============ CATEGORIAS ============
  categories: router({
    list: publicProcedure.query(async () => {
      return await getCategories();
    }),

    create: publicProcedure
      .input(
        z.object({
          name: z.string(),
          icon: z.string().optional(),
          color: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await createCategory({
          name: input.name,
          icon: input.icon,
          color: input.color,
        });

        return { success: true };
      }),

    autoCategorize: publicProcedure
      .input(z.object({ description: z.string() }))
      .query(async ({ input }) => {
        return await autoCategorizeTransaction(input.description);
      }),
  }),

  // ============ MÉTODOS DE PAGAMENTO ============
  paymentMethods: router({
    list: publicProcedure.query(async () => {
      return await getPaymentMethods();
    }),

    /**
     * Criar um novo método de pagamento
     */
    create: publicProcedure
      .input(
        z.object({
          name: z.string(),
          icon: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await createPaymentMethod({
          name: input.name,
          icon: input.icon,
        });

        return { success: true };
      }),
  }),

  // ============ METAS (BUDGETS) ============
  budgets: router({
    list: publicProcedure
      .input(z.object({ month: z.string().optional() }))
      .query(async ({ input }) => {
        return await getBudgets(input.month);
      }),

    progress: publicProcedure
      .input(z.any().optional())
      .query(async ({ input }) => {
        const month = input?.month || undefined;
        return await getBudgetProgress(month);
      }),

    create: publicProcedure
      .input(z.object({ category: z.string(), limit: z.number().positive(), month: z.string() }))
      .mutation(async ({ input }) => {
        await createBudget({ category: input.category, limit: input.limit.toString(), month: input.month });
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({ id: z.number(), limit: z.number().positive().optional() }))
      .mutation(async ({ input }) => {
        await updateBudget(input.id, { limit: input.limit?.toString() });
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBudget(input.id);
        return { success: true };
      }),
  }),

  // ============ USER SETTINGS ============
  settings: router({
    getLimit: protectedProcedure.query(async ({ ctx }) => {
      const settings = await getUserSettings(ctx.user.id);
      return {
        globalSpendingLimit: settings ? parseFloat(settings.globalSpendingLimit.toString()) : 5000,
      };
    }),

    updateLimit: protectedProcedure
      .input(z.object({ globalSpendingLimit: z.number().positive() }))
      .mutation(async ({ ctx, input }) => {
        await updateUserSettings(ctx.user.id, input.globalSpendingLimit);
        return { success: true };
      }),
  }),

  // ============ TAGS ============
  tags: router({
    list: publicProcedure.query(async () => {
      return await getTags();
    }),

    create: publicProcedure
      .input(z.object({ name: z.string(), color: z.string().optional() }))
      .mutation(async ({ input }) => {
        const tag = await createTag({
          name: input.name,
          color: input.color || "#6366f1",
        });
        return tag;
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteTag(input.id);
        return { success: true };
      }),

    addToTransaction: publicProcedure
      .input(z.object({ transactionId: z.number(), tagId: z.number() }))
      .mutation(async ({ input }) => {
        await addTagToTransaction(input.transactionId, input.tagId);
        return { success: true };
      }),

    removeFromTransaction: publicProcedure
      .input(z.object({ transactionId: z.number(), tagId: z.number() }))
      .mutation(async ({ input }) => {
        await removeTagFromTransaction(input.transactionId, input.tagId);
        return { success: true };
      }),

    getTransactionTags: publicProcedure
      .input(z.object({ transactionId: z.number() }))
      .query(async ({ input }) => {
        return await getTransactionTags(input.transactionId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
